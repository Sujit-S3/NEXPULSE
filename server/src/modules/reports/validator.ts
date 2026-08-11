import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const createReportSchema = z.object({
  connectionId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  from: isoDate,
  to: isoDate,
}).refine((value) => value.from <= value.to, {
  path: ['from'],
  message: 'from must be before or equal to to',
});

export const reportsQuerySchema = z.object({
  connectionId: z.string().min(1),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']),
});
