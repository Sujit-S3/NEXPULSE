import { z } from 'zod';

const presetSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  density: z.enum(['compact', 'comfortable', 'spacious']),
  accentColor: z.enum(['blue', 'cyan', 'green', 'orange']),
  motionIntensity: z.enum(['reduced', 'balanced', 'full']),
  glassTransparency: z.number().min(0.45).max(0.88),
  sidebarWidth: z.number().int().min(220).max(340),
  dashboardWidgetOrder: z.array(z.string().trim().min(1).max(80)).max(30),
  createdAt: z.coerce.date(),
});

const workspacePersonalizationSchema = z.object({
  density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
  accentColor: z.enum(['blue', 'cyan', 'green', 'orange']).optional(),
  motionIntensity: z.enum(['reduced', 'balanced', 'full']).optional(),
  glassTransparency: z.number().min(0.45).max(0.88).optional(),
  sidebarWidth: z.number().int().min(220).max(340).optional(),
  dashboardWidgetOrder: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  presets: z.array(presetSchema).max(12).optional(),
});

export const updateSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  notifications: z.boolean().optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  language: z.string().trim().min(2).max(20).optional(),
  emailReports: z.boolean().optional(),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  autoSync: z.boolean().optional(),
  syncInterval: z.number().int().min(15).max(1440).optional(),
  workspace: workspacePersonalizationSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one setting is required',
});
