import { AuthorizationError, ConflictError, NotFoundError } from '../../errors/index.js';
import type { Permission } from '../identity/permissions.js';
import { PluginInstallation, PluginPackage, type IPluginPackage, type PluginCapability } from './model.js';
import { webhookService } from './webhookService.js';

function publicPackage(plugin: IPluginPackage) {
  const averageRating = plugin.reviews.length === 0
    ? 0
    : plugin.reviews.reduce((sum, review) => sum + review.rating, 0) / plugin.reviews.length;
  return {
    id: plugin._id.toString(),
    slug: plugin.slug,
    name: plugin.name,
    description: plugin.description,
    publisher: plugin.publisher,
    homepage: plugin.homepage,
    capabilities: plugin.capabilities,
    requiredPermissions: plugin.requiredPermissions,
    status: plugin.status,
    versions: plugin.versions.map((version) => ({
      version: version.version,
      runtimeApiVersion: version.runtimeApiVersion,
      checksum: version.checksum,
      dependencies: version.dependencies,
      releasedAt: version.releasedAt?.toISOString(),
    })),
    averageRating: Number(averageRating.toFixed(1)),
    reviewCount: plugin.reviews.length,
    createdAt: plugin.createdAt.toISOString(),
    updatedAt: plugin.updatedAt.toISOString(),
  };
}

function assertPermissions(
  actorPermissions: readonly Permission[],
  requiredPermissions: readonly Permission[],
  grantedPermissions: readonly Permission[],
): Permission[] {
  const actor = new Set(actorPermissions);
  const granted = new Set(grantedPermissions);
  const missing = requiredPermissions.find((permission) => !granted.has(permission));
  const elevated = grantedPermissions.find((permission) => !actor.has(permission));
  if (missing) throw new AuthorizationError(`Plugin requires permission: ${missing}`);
  if (elevated) throw new AuthorizationError(`Cannot grant permission you do not hold: ${elevated}`);
  return Array.from(granted);
}

export const pluginService = {
  async submit(input: {
    userId: string;
    slug: string;
    name: string;
    description: string;
    publisher: string;
    homepage?: string;
    capabilities: PluginCapability[];
    requiredPermissions: Permission[];
    version: {
      version: string;
      runtimeApiVersion: string;
      entrypoint: string;
      checksum: string;
      dependencies: Record<string, string>;
    };
  }) {
    try {
      const plugin = await PluginPackage.create({
        slug: input.slug,
        name: input.name,
        description: input.description,
        publisher: input.publisher,
        homepage: input.homepage,
        capabilities: Array.from(new Set(input.capabilities)),
        requiredPermissions: Array.from(new Set(input.requiredPermissions)),
        status: 'pending_review',
        versions: [input.version],
        createdBy: input.userId,
      });
      return publicPackage(plugin);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
        throw new ConflictError('Plugin slug is already registered');
      }
      throw error;
    }
  },

  async approve(pluginId: string, approved: boolean) {
    const now = new Date();
    const plugin = await PluginPackage.findOneAndUpdate(
      { _id: pluginId, status: 'pending_review' },
      {
        $set: {
          status: approved ? 'approved' : 'rejected',
          ...(approved ? { 'versions.$[].releasedAt': now } : {}),
        },
      },
      { new: true },
    ).exec();
    if (!plugin) throw new NotFoundError('Pending plugin submission not found');
    return publicPackage(plugin);
  },

  async marketplace(search?: string) {
    const escaped = search?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const plugins = await PluginPackage.find({
      status: 'approved',
      ...(escaped ? { $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { publisher: { $regex: escaped, $options: 'i' } },
      ] } : {}),
    }).sort({ updatedAt: -1 }).exec();
    return plugins.map(publicPackage);
  },

  async submissions(userId: string, canReview: boolean) {
    const plugins = await PluginPackage.find(canReview ? {} : { createdBy: userId }).sort({ createdAt: -1 }).exec();
    return plugins.map(publicPackage);
  },

  async install(input: {
    workspaceId: string;
    userId: string;
    actorPermissions: Permission[];
    pluginId: string;
    version: string;
    grantedPermissions: Permission[];
    organizationId?: string;
  }) {
    const plugin = await PluginPackage.findOne({ _id: input.pluginId, status: 'approved' }).exec();
    if (!plugin) throw new NotFoundError('Approved plugin not found');
    if (!plugin.versions.some((candidate) => candidate.version === input.version && candidate.releasedAt)) {
      throw new NotFoundError('Released plugin version not found');
    }
    const permissions = assertPermissions(
      input.actorPermissions,
      plugin.requiredPermissions,
      input.grantedPermissions,
    );
    const installation = await PluginInstallation.findOneAndUpdate(
      { workspaceId: input.workspaceId, pluginId: plugin._id },
      {
        $set: {
          version: input.version,
          grantedPermissions: permissions,
          status: 'active',
          installedBy: input.userId,
          installedAt: new Date(),
        },
        $setOnInsert: { configuration: {} },
      },
      { upsert: true, new: true },
    ).exec();
    await webhookService.publish({
      type: 'plugin.installed',
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.userId,
      data: { pluginId: plugin._id.toString(), slug: plugin.slug, version: input.version },
    });
    return {
      id: installation._id.toString(),
      plugin: publicPackage(plugin),
      version: installation.version,
      grantedPermissions: installation.grantedPermissions,
      status: installation.status,
      installedAt: installation.installedAt.toISOString(),
    };
  },

  async installations(workspaceId: string) {
    const installations = await PluginInstallation.find({ workspaceId, status: { $ne: 'uninstalled' } })
      .populate<{ pluginId: IPluginPackage }>('pluginId')
      .sort({ updatedAt: -1 })
      .exec();
    return installations.filter((installation) => installation.pluginId).map((installation) => ({
      id: installation._id.toString(),
      plugin: publicPackage(installation.pluginId),
      version: installation.version,
      grantedPermissions: installation.grantedPermissions,
      status: installation.status,
      installedAt: installation.installedAt.toISOString(),
    }));
  },

  async setInstallationStatus(
    workspaceId: string,
    installationId: string,
    status: 'active' | 'disabled' | 'uninstalled',
  ) {
    const installation = await PluginInstallation.findOneAndUpdate(
      { _id: installationId, workspaceId, status: { $ne: 'uninstalled' } },
      { $set: { status } },
      { new: true },
    ).exec();
    if (!installation) throw new NotFoundError('Plugin installation not found');
  },

  async review(input: { pluginId: string; userId: string; rating: number; comment?: string }) {
    const plugin = await PluginPackage.findOne({ _id: input.pluginId, status: 'approved' }).exec();
    if (!plugin) throw new NotFoundError('Approved plugin not found');
    const existing = plugin.reviews.find((review) => review.userId.toString() === input.userId);
    if (existing) {
      existing.rating = input.rating;
      existing.comment = input.comment;
      existing.createdAt = new Date();
    } else {
      plugin.reviews.push({
        userId: input.userId as never,
        rating: input.rating,
        comment: input.comment,
        createdAt: new Date(),
      });
    }
    await plugin.save();
    return publicPackage(plugin);
  },
};
