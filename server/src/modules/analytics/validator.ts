import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const analyticsQuerySchema = z
  .object({
    connectionId: z.string().min(1),
    from: isoDate.optional(),
    to: isoDate.optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    refresh: z.enum(['true', 'false']).optional().default('false'),
  })
  .transform((value) => {
    const to = value.to ?? new Date();
    const from = value.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      ...value,
      from,
      to,
      forceRefresh: value.refresh === 'true',
    };
  })
  .refine((value) => value.from.getTime() <= value.to.getTime(), {
    message: 'from must be before or equal to to',
    path: ['from'],
  });
