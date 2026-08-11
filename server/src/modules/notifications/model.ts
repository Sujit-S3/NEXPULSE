import mongoose, { type Document, Schema, type Types } from 'mongoose';

export type NotificationType =
  | 'sync'
  | 'connection'
  | 'alert'
  | 'insight'
  | 'report'
  | 'system'
  | 'mention'
  | 'approval'
  | 'task'
  | 'health';

export interface INotification extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: Date;
  archivedAt?: Date;
  actionable: boolean;
  actionLabel?: string;
  actionPath?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'sync', 'connection', 'alert', 'insight', 'report', 'system',
        'mention', 'approval', 'task', 'health',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    readAt: { type: Date },
    archivedAt: { type: Date },
    actionable: { type: Boolean, default: false },
    actionLabel: { type: String, maxlength: 80 },
    actionPath: { type: String, maxlength: 300 },
    resourceType: { type: String, maxlength: 80 },
    resourceId: { type: String, maxlength: 200 },
  },
  { timestamps: true },
);

notificationSchema.index({ workspaceId: 1, userId: 1, archivedAt: 1, createdAt: -1 });
notificationSchema.index({ workspaceId: 1, userId: 1, readAt: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);
