import { z } from 'zod';

export const startOAuthSchema = z.object({
  returnTo: z.enum(['/platforms', '/settings']).optional().default('/platforms'),
  forceConsent: z.boolean().optional().default(false),
});

export const selectAccountsSchema = z.object({
  accountIds: z.array(z.string().min(1)).min(1),
  primaryAccountId: z.string().min(1),
});
