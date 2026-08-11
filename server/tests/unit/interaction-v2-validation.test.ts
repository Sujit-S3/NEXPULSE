import { describe, expect, it } from 'vitest';
import { updateSettingsSchema } from '../../src/modules/settings/validator.js';
import { notificationsQuerySchema } from '../../src/modules/notifications/validator.js';

describe('Interaction & Motion System V2 validation', () => {
  it('accepts a complete persisted workspace personalization preset', () => {
    const result = updateSettingsSchema.safeParse({
      workspace: {
        density: 'compact',
        accentColor: 'cyan',
        motionIntensity: 'balanced',
        glassTransparency: 0.68,
        sidebarWidth: 288,
        dashboardWidgetOrder: ['reach', 'followers', 'engagementRate'],
        presets: [{
          id: 'executive-focus',
          name: 'Executive focus',
          density: 'compact',
          accentColor: 'cyan',
          motionIntensity: 'balanced',
          glassTransparency: 0.68,
          sidebarWidth: 288,
          dashboardWidgetOrder: ['reach', 'followers', 'engagementRate'],
          createdAt: '2026-07-27T12:00:00.000Z',
        }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects personalization values outside the performance-safe bounds', () => {
    expect(updateSettingsSchema.safeParse({
      workspace: { glassTransparency: 0.99, sidebarWidth: 800 },
    }).success).toBe(false);
  });

  it.each(['mention', 'approval', 'task', 'health'] as const)(
    'accepts the %s enterprise notification category',
    (type) => {
      expect(notificationsQuerySchema.safeParse({ type }).success).toBe(true);
    },
  );
});
