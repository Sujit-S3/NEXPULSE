import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { AuthorizationError, NotFoundError, ValidationError } from '../../errors/index.js';
import { requirePermission } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { userRepository, workspaceRepository } from '../auth/repository.js';
import { Organization } from '../identity/model.js';
import { webhookService } from './webhookService.js';

function current(req: Request) {
  if (!req.user) throw new AuthorizationError('Authentication required');
  return req.user;
}

async function activeOrganization(req: Request) {
  const user = current(req);
  const workspace = await workspaceRepository.findById(user.workspaceId);
  if (!workspace?.organizationId) throw new NotFoundError('Active workspace does not belong to an organization');
  const organization = await Organization.findOne({ _id: workspace.organizationId, status: 'active' }).exec();
  if (!organization) throw new NotFoundError('Active organization not found');
  return organization;
}

function publicOrganization(organization: Awaited<ReturnType<typeof activeOrganization>>) {
  return {
    id: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    ownerId: organization.ownerId.toString(),
    memberCount: organization.members.filter((member) => member.status === 'active').length,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

const controller = {
  async organization(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(publicOrganization(await activeOrganization(req))));
  },

  async updateOrganization(req: Request, res: Response): Promise<void> {
    const user = current(req);
    const organization = await activeOrganization(req);
    organization.name = req.body.name ?? organization.name;
    organization.slug = req.body.slug ?? organization.slug;
    await organization.save();
    await webhookService.publish({
      type: 'organization.updated',
      workspaceId: user.workspaceId,
      organizationId: organization._id.toString(),
      actorId: user.id,
      data: { organizationId: organization._id.toString(), name: organization.name, slug: organization.slug },
    });
    res.status(200).json(apiResponse(publicOrganization(organization)));
  },

  async users(req: Request, res: Response): Promise<void> {
    const user = current(req);
    const ids = await workspaceRepository.memberIds(user.workspaceId);
    const users = await userRepository.findByIds(ids);
    res.status(200).json(apiResponse(users.map((member) => ({
      id: member._id.toString(),
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      avatar: member.avatar,
      status: member.status,
      createdAt: member.createdAt.toISOString(),
    }))));
  },

  async user(req: Request, res: Response): Promise<void> {
    const user = current(req);
    const userId = req.params['userId'];
    if (typeof userId !== 'string' || !/^[a-f\d]{24}$/i.test(userId)) {
      throw new ValidationError({ userId: ['Invalid user identifier'] });
    }
    const ids = await workspaceRepository.memberIds(user.workspaceId);
    if (!ids.includes(userId)) throw new NotFoundError('User not found in the active workspace');
    const member = await userRepository.findById(userId);
    if (!member) throw new NotFoundError('User not found');
    res.status(200).json(apiResponse({
      id: member._id.toString(),
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      avatar: member.avatar,
      status: member.status,
      createdAt: member.createdAt.toISOString(),
    }));
  },
};

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).optional(),
}).refine((input) => Object.keys(input).length > 0, 'At least one field is required');

const router = Router();
router.get(
  '/organizations/current',
  requireAuth,
  requirePermission('organizations.read'),
  asyncHandler(controller.organization),
);
router.patch(
  '/organizations/current',
  requireAuth,
  requirePermission('organizations.manage'),
  requireTrustedOrigin,
  validate(updateOrganizationSchema),
  asyncHandler(controller.updateOrganization),
);
router.get('/users', requireAuth, requirePermission('users.read'), asyncHandler(controller.users));
router.get('/users/:userId', requireAuth, requirePermission('users.read'), asyncHandler(controller.user));

export { router as publicResourceRoutes };
