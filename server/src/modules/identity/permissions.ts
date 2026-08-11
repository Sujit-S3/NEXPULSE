export const PERMISSIONS = [
  'workspace.read',
  'workspace.write',
  'workspace.delete',
  'workspace.switch',
  'analytics.read',
  'analytics.export',
  'reports.read',
  'reports.generate',
  'reports.delete',
  'team.read',
  'team.invite',
  'team.remove',
  'team.manage',
  'billing.manage',
  'platform.read',
  'platform.connect',
  'platform.disconnect',
  'ai.use',
  'settings.read',
  'settings.manage',
  'notifications.read',
  'notifications.manage',
  'identity.sessions.manage',
  'identity.api_keys.manage',
  'identity.service_accounts.manage',
  'identity.audit.read',
  'identity.mfa.manage',
  'organizations.read',
  'organizations.manage',
  'users.read',
  'dashboard.read',
  'automation.read',
  'automation.manage',
  'developer.applications.manage',
  'developer.webhooks.manage',
  'developer.analytics.read',
  'developer.plugins.manage',
  'security.dashboard.read',
  'security.policies.manage',
  'security.secrets.manage',
  'security.governance.manage',
  'security.compliance.read',
  'security.threats.manage',
  'security.incidents.manage',
  'operations.queues.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  'super_admin',
  'organization_owner',
  'workspace_owner',
  'workspace_admin',
  'manager',
  'editor',
  'analyst',
  'viewer',
  'guest',
  'service_account',
] as const;

export type IdentityRole = (typeof ROLES)[number];

const all = [...PERMISSIONS];

function inherit(...permissionSets: readonly (readonly Permission[])[]): Permission[] {
  return Array.from(new Set(permissionSets.flat()));
}

const guestPermissions: Permission[] = [
  'workspace.read', 'workspace.switch', 'analytics.read', 'reports.read', 'platform.read',
  'identity.sessions.manage', 'identity.mfa.manage',
];
const viewerPermissions = inherit(guestPermissions, [
  'team.read', 'settings.read', 'notifications.read',
]);
const analystPermissions = inherit(viewerPermissions, [
  'analytics.export', 'reports.generate', 'ai.use',
]);
const editorPermissions = inherit(analystPermissions, ['workspace.write']);
const managerPermissions = inherit(editorPermissions, [
  'team.invite', 'platform.connect', 'platform.disconnect', 'notifications.manage',
]);
const workspaceAdminPermissions = all.filter((permission) => permission !== 'workspace.delete');

export const ROLE_PERMISSIONS: Readonly<Record<IdentityRole, readonly Permission[]>> = {
  super_admin: all,
  organization_owner: all,
  workspace_owner: all,
  workspace_admin: workspaceAdminPermissions,
  manager: managerPermissions,
  editor: editorPermissions,
  analyst: analystPermissions,
  viewer: viewerPermissions,
  guest: guestPermissions,
  service_account: [],
};

const ROLE_RANK: Readonly<Record<IdentityRole, number>> = {
  super_admin: 100,
  organization_owner: 90,
  workspace_owner: 80,
  workspace_admin: 70,
  manager: 60,
  editor: 50,
  analyst: 40,
  viewer: 30,
  guest: 20,
  service_account: 10,
};

const legacyRoles: Record<string, IdentityRole> = {
  owner: 'workspace_owner',
  admin: 'workspace_admin',
};

export function normalizeRole(value: string): IdentityRole {
  const normalized = legacyRoles[value] ?? value;
  return ROLES.includes(normalized as IdentityRole)
    ? normalized as IdentityRole
    : 'guest';
}

export function permissionsForRole(role: string): Permission[] {
  return [...ROLE_PERMISSIONS[normalizeRole(role)]];
}

export function effectivePermissions(role: string, scopes?: readonly string[]): Permission[] {
  const granted = permissionsForRole(role);
  if (!scopes) return granted;
  const scopeSet = new Set(scopes);
  return granted.filter((permission) => scopeSet.has(permission));
}

export function canAssignRole(actorRole: string, targetRole: string): boolean {
  return ROLE_RANK[normalizeRole(actorRole)] > ROLE_RANK[normalizeRole(targetRole)];
}

export function isPermission(value: string): value is Permission {
  return PERMISSIONS.includes(value as Permission);
}
