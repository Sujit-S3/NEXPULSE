import type {
  OAuthProviderAdapter,
  PlatformType,
  PublicOAuthProvider,
  PublicOAuthProviderStatus,
} from '../types.js';
import { instagramAdapter, facebookAdapter } from '../providers/meta.js';
import { linkedinAdapter } from '../providers/linkedin.js';
import { tiktokAdapter } from '../providers/tiktok.js';
import { youtubeAdapter } from '../providers/youtube.js';
import { xAdapter } from '../providers/x.js';
import { pinterestAdapter } from '../providers/pinterest.js';
import { AppError, NotFoundError } from '../../../errors/index.js';
import { hasValidEncryptionKey } from '../oauth/crypto.js';

const adapters: Record<PlatformType, OAuthProviderAdapter> = {
  instagram: instagramAdapter,
  facebook: facebookAdapter,
  linkedin: linkedinAdapter,
  tiktok: tiktokAdapter,
  youtube: youtubeAdapter,
  x: xAdapter,
  pinterest: pinterestAdapter,
};

export function getAdapter(platform: PlatformType): OAuthProviderAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new NotFoundError(`Platform adapter not found: ${platform}`);
  }
  if (!hasValidEncryptionKey() || !adapter.isConfigured()) {
    throw new AppError(
      `${adapter.displayName} OAuth is not configured`,
      503,
      'OAUTH_NOT_CONFIGURED',
    );
  }
  return adapter;
}

export function getSupportedPlatforms(): PublicOAuthProvider[] {
  if (!hasValidEncryptionKey()) return [];
  return Object.values(adapters)
    .filter((adapter) => adapter.isConfigured())
    .map((adapter) => ({
      id: adapter.platform,
      name: adapter.displayName,
      scopes: adapter.scopes,
    }));
}

export function getPlatformStatuses(): PublicOAuthProviderStatus[] {
  const encryptionConfigured = hasValidEncryptionKey();
  return Object.values(adapters).map((adapter) => ({
    id: adapter.platform,
    name: adapter.displayName,
    scopes: adapter.scopes,
    configured: encryptionConfigured && adapter.isConfigured(),
  }));
}
