import mongoose from 'mongoose';
import { NotificationModel } from './model.js';
import type { INotification, NotificationType } from './model.js';

interface ListFilter {
  status: 'all' | 'read' | 'unread' | 'archived';
  type?: NotificationType;
  search?: string;
}

function filter(workspaceId: string, userId: string, input: ListFilter) {
  const query: Record<string, unknown> = { workspaceId, userId };
  if (input.status === 'archived') query['archivedAt'] = { $ne: null };
  else query['archivedAt'] = null;
  if (input.status === 'read') query['readAt'] = { $ne: null };
  if (input.status === 'unread') query['readAt'] = null;
  if (input.type) query['type'] = input.type;
  if (input.search) {
    const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query['$or'] = [
      { title: { $regex: escaped, $options: 'i' } },
      { message: { $regex: escaped, $options: 'i' } },
    ];
  }
  return query;
}

export const notificationRepository = {
  async createMany(
    workspaceId: string,
    userIds: string[],
    input: Omit<
      Pick<
        INotification,
        | 'type'
        | 'title'
        | 'message'
        | 'actionable'
        | 'actionLabel'
        | 'actionPath'
        | 'resourceType'
        | 'resourceId'
      >,
      never
    >,
  ): Promise<INotification[]> {
    if (userIds.length === 0) return [];
    return NotificationModel.insertMany(
      userIds.map((userId) => ({
        ...input,
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        userId: new mongoose.Types.ObjectId(userId),
      })),
    ) as unknown as Promise<INotification[]>;
  },

  async list(
    workspaceId: string,
    userId: string,
    input: ListFilter & { page: number; limit: number },
  ): Promise<{ items: INotification[]; total: number; unread: number }> {
    const query = filter(workspaceId, userId, input);
    const [items, total, unread] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .exec(),
      NotificationModel.countDocuments(query).exec(),
      NotificationModel.countDocuments({
        workspaceId,
        userId,
        archivedAt: null,
        readAt: null,
      }).exec(),
    ]);
    return { items, total, unread };
  },

  async markRead(workspaceId: string, userId: string, id: string): Promise<INotification | null> {
    return NotificationModel.findOneAndUpdate(
      { _id: id, workspaceId, userId },
      { $set: { readAt: new Date() } },
      { new: true },
    ).exec();
  },

  async markAllRead(workspaceId: string, userId: string): Promise<void> {
    await NotificationModel.updateMany(
      { workspaceId, userId, archivedAt: null, readAt: null },
      { $set: { readAt: new Date() } },
    ).exec();
  },

  async archive(workspaceId: string, userId: string, id: string): Promise<INotification | null> {
    return NotificationModel.findOneAndUpdate(
      { _id: id, workspaceId, userId },
      { $set: { archivedAt: new Date(), readAt: new Date() } },
      { new: true },
    ).exec();
  },
};
