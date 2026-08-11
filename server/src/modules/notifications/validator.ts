import { z } from 'zod';

export const notificationsQuerySchema = z.object({
  status: z.enum(['all', 'read', 'unread', 'archived']).optional().default('all'),
  type: z.enum([
    'sync', 'connection', 'alert', 'insight', 'report', 'system',
    'mention', 'approval', 'task', 'health',
  ]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
