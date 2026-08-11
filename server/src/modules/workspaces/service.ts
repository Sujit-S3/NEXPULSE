import { AuthorizationError, NotFoundError } from '../../errors/index.js';
import { userRepository, workspaceRepository } from '../auth/repository.js';
import { identitySessionService } from '../identity/sessionService.js';
import type { IWorkspace } from '../auth/model.js';

function publicWorkspace(workspace: IWorkspace) {
  return {
    id: workspace._id.toString(),
    name: workspace.name,
    slug: workspace.slug,
    logo: workspace.logo,
    plan: workspace.plan,
    members: workspace.members.length,
    settings: workspace.settings,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export const workspaceService = {
  async list(userId: string) {
    const workspaces = await workspaceRepository.findByUser(userId);
    return workspaces.map(publicWorkspace);
  },

  async current(workspaceId: string, userId: string) {
    const workspace = await workspaceRepository.findForMember(workspaceId, userId);
    if (!workspace) throw new NotFoundError('Workspace not found');
    return publicWorkspace(workspace);
  },

  async switch(userId: string, sessionId: string, workspaceId: string) {
    const workspace = await workspaceRepository.findForMember(workspaceId, userId);
    if (!workspace) throw new AuthorizationError('You do not belong to this workspace');
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) throw new NotFoundError('User not found');
    const identity = await identitySessionService.switchWorkspace(currentUser, sessionId, workspaceId);
    return {
      workspace: publicWorkspace(workspace),
      ...identity,
    };
  },

  memberIds(workspaceId: string) {
    return workspaceRepository.memberIds(workspaceId);
  },
};
