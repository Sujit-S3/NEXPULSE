import { NotFoundError } from '../../errors/index.js';
import { workspaceService } from '../workspaces/service.js';
import type { INotification, NotificationType } from './model.js';
import { notificationRepository } from './repository.js';
import { publishNotificationEvent } from './events.js';

export function publicNotification(notification: INotification) {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    timestamp: notification.createdAt.toISOString(),
    read: Boolean(notification.readAt),
    archived: Boolean(notification.archivedAt),
    actionable: notification.actionable,
    actionLabel: notification.actionLabel,
    actionPath: notification.actionPath,
  };
}

export async function createWorkspaceNotification(
  workspaceId: string,
  input: {
    type: NotificationType;
    title: string;
    message: string;
    actionable?: boolean;
    actionLabel?: string;
    actionPath?: string;
    resourceType?: string;
    resourceId?: string;
  },
): Promise<void> {
  const members = await workspaceService.memberIds(workspaceId);
  const created = await notificationRepository.createMany(workspaceId, members, {
    ...input,
    actionable: input.actionable ?? false,
  });
  for (const notification of created) {
    publishNotificationEvent(
      workspaceId,
      notification.userId.toString(),
      { kind: 'created', notification: publicNotification(notification) },
    );
  }
}

export const notificationService = {
  async list(
    workspaceId: string,
    userId: string,
    input: {
      status: 'all' | 'read' | 'unread' | 'archived';
      type?: NotificationType;
      search?: string;
      page: number;
      limit: number;
    },
  ) {
    const result = await notificationRepository.list(workspaceId, userId, input);
    return {
      items: result.items.map(publicNotification),
      unread: result.unread,
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        hasNext: input.page * input.limit < result.total,
        hasPrevious: input.page > 1,
      },
    };
  },

  async markRead(workspaceId: string, userId: string, id: string) {
    const notification = await notificationRepository.markRead(workspaceId, userId, id);
    if (!notification) throw new NotFoundError('Notification not found');
    const result = publicNotification(notification);
    publishNotificationEvent(workspaceId, userId, { kind: 'updated', notification: result });
    return result;
  },

  async markAllRead(workspaceId: string, userId: string) {
    await notificationRepository.markAllRead(workspaceId, userId);
    publishNotificationEvent(workspaceId, userId, { kind: 'updated' });
  },

  async archive(workspaceId: string, userId: string, id: string) {
    const notification = await notificationRepository.archive(workspaceId, userId, id);
    if (!notification) throw new NotFoundError('Notification not found');
    const result = publicNotification(notification);
    publishNotificationEvent(workspaceId, userId, { kind: 'updated', notification: result });
    return result;
  },
};
