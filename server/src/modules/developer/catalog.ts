import type { Permission } from '../identity/permissions.js';

export interface PlatformEventDefinition {
  type: string;
  category: string;
  description: string;
  schemaVersion: '1.0';
}

export const EVENT_CATALOG = [
  { type: 'user.created', category: 'identity', description: 'A user joined the platform.', schemaVersion: '1.0' },
  { type: 'workspace.created', category: 'workspace', description: 'A workspace was created.', schemaVersion: '1.0' },
  { type: 'workspace.updated', category: 'workspace', description: 'Workspace settings or metadata changed.', schemaVersion: '1.0' },
  { type: 'dashboard.updated', category: 'dashboard', description: 'Dashboard data or layout changed.', schemaVersion: '1.0' },
  { type: 'analytics.synced', category: 'analytics', description: 'Analytics ingestion completed.', schemaVersion: '1.0' },
  { type: 'report.generated', category: 'reports', description: 'A report finished generating.', schemaVersion: '1.0' },
  { type: 'workflow.executed', category: 'automation', description: 'An automation workflow completed.', schemaVersion: '1.0' },
  { type: 'ai.insight.created', category: 'ai', description: 'An AI insight was created.', schemaVersion: '1.0' },
  { type: 'platform.connected', category: 'connections', description: 'A platform connection became active.', schemaVersion: '1.0' },
  { type: 'organization.updated', category: 'organizations', description: 'Organization metadata or status changed.', schemaVersion: '1.0' },
  { type: 'developer.application.created', category: 'developer', description: 'A developer application was registered.', schemaVersion: '1.0' },
  { type: 'webhook.test', category: 'developer', description: 'A developer-requested webhook test was queued.', schemaVersion: '1.0' },
  { type: 'plugin.installed', category: 'plugins', description: 'A marketplace plugin was installed.', schemaVersion: '1.0' },
] as const satisfies readonly PlatformEventDefinition[];

export type PlatformEventType = (typeof EVENT_CATALOG)[number]['type'];

const eventTypes = new Set<string>(EVENT_CATALOG.map((event) => event.type));

export function isCatalogEvent(value: string): value is PlatformEventType {
  return eventTypes.has(value);
}

export function matchesEventSubscription(subscription: string, eventType: string): boolean {
  if (subscription === '*') return true;
  if (subscription.endsWith('.*')) return eventType.startsWith(subscription.slice(0, -1));
  return subscription === eventType;
}

export const PUBLIC_API_SCOPES: Readonly<Record<string, readonly Permission[]>> = {
  organizations: ['organizations.read', 'organizations.manage'],
  users: ['users.read'],
  workspaces: ['workspace.read', 'workspace.write'],
  analytics: ['analytics.read', 'analytics.export'],
  reports: ['reports.read', 'reports.generate', 'reports.delete'],
  dashboards: ['dashboard.read'],
  ai: ['ai.use'],
  automation: ['automation.read', 'automation.manage'],
  notifications: ['notifications.read', 'notifications.manage'],
  connections: ['platform.read', 'platform.connect', 'platform.disconnect'],
  developer: [
    'developer.applications.manage',
    'developer.webhooks.manage',
    'developer.analytics.read',
    'developer.plugins.manage',
  ],
};

export const API_LIFECYCLE = {
  current: 'v1',
  supported: ['v1'],
  sunsetNoticeDays: 180,
  compatibility: 'Additive changes remain compatible within a major API version.',
  migration: 'Breaking changes are introduced under a new /api/v{n} route with a published migration contract.',
} as const;

export const PLUGIN_RUNTIME_API_VERSION = 'v1';
