import { ConflictError, NotFoundError } from '../../errors/index.js';
import type { Permission } from '../identity/permissions.js';
import type { PluginCapability } from './model.js';
import { PLUGIN_RUNTIME_API_VERSION } from './catalog.js';

export interface PluginContext {
  workspaceId: string;
  installationId: string;
  grantedPermissions: readonly Permission[];
}

export interface PluginContribution {
  capability: PluginCapability;
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface TrustedPluginModule {
  slug: string;
  version: string;
  runtimeApiVersion: string;
  capabilities: readonly PluginCapability[];
  activate(context: PluginContext): Promise<readonly PluginContribution[]>;
}

const trustedModules = new Map<string, TrustedPluginModule>();

function moduleKey(slug: string, version: string): string {
  return `${slug}@${version}`;
}

export function registerTrustedPlugin(module: TrustedPluginModule): void {
  if (module.runtimeApiVersion !== PLUGIN_RUNTIME_API_VERSION) {
    throw new ConflictError(`Plugin runtime ${module.runtimeApiVersion} is not supported`);
  }
  const key = moduleKey(module.slug, module.version);
  if (trustedModules.has(key)) throw new ConflictError(`Plugin runtime already registered: ${key}`);
  trustedModules.set(key, module);
}

export function unregisterTrustedPlugin(slug: string, version: string): void {
  trustedModules.delete(moduleKey(slug, version));
}

export async function loadTrustedPlugin(input: {
  slug: string;
  version: string;
  context: PluginContext;
  allowedCapabilities: readonly PluginCapability[];
}): Promise<readonly PluginContribution[]> {
  const module = trustedModules.get(moduleKey(input.slug, input.version));
  if (!module) throw new NotFoundError('Trusted plugin runtime is not registered on this node');
  const allowed = new Set(input.allowedCapabilities);
  const unsupported = module.capabilities.find((capability) => !allowed.has(capability));
  if (unsupported) throw new ConflictError(`Plugin runtime requested undeclared capability: ${unsupported}`);
  const contributions = await module.activate(input.context);
  const invalid = contributions.find((contribution) => !module.capabilities.includes(contribution.capability));
  if (invalid) throw new ConflictError(`Plugin emitted undeclared capability: ${invalid.capability}`);
  return contributions;
}
