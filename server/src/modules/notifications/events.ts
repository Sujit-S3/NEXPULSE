import { EventEmitter } from 'node:events';

export interface NotificationEvent {
  kind: 'created' | 'updated';
  notification?: {
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    archived: boolean;
    actionable: boolean;
    actionLabel?: string;
    actionPath?: string;
  };
}

const events = new EventEmitter();
events.setMaxListeners(0);

function channel(workspaceId: string, userId: string): string {
  return `${workspaceId}:${userId}`;
}

export function publishNotificationEvent(
  workspaceId: string,
  userId: string,
  event: NotificationEvent,
): void {
  events.emit(channel(workspaceId, userId), event);
}

export function subscribeToNotificationEvents(
  workspaceId: string,
  userId: string,
  listener: (event: NotificationEvent) => void,
): () => void {
  const key = channel(workspaceId, userId);
  events.on(key, listener);
  return () => events.off(key, listener);
}
