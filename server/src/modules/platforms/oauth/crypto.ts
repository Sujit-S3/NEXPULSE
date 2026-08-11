import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { config } from '../../../config/env.js';
import { AppError } from '../../../errors/index.js';

function getEncryptionKey(): Buffer {
  const configured = config.oauth.tokenEncryptionKey;
  if (!configured) {
    throw new AppError(
      'OAuth token encryption is not configured',
      503,
      'OAUTH_NOT_CONFIGURED',
    );
  }

  const key = /^[0-9a-f]{64}$/i.test(configured)
    ? Buffer.from(configured, 'hex')
    : Buffer.from(configured, 'base64');

  if (key.length !== 32) {
    throw new AppError(
      'OAUTH_TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes',
      503,
      'OAUTH_NOT_CONFIGURED',
    );
  }
  return key;
}

export function hasValidEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new AppError('Stored OAuth credential is invalid', 500, 'OAUTH_CREDENTIAL_INVALID');
  }
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new AppError('Stored OAuth credential could not be decrypted', 500, 'OAUTH_CREDENTIAL_INVALID');
  }
}

export function randomOpaqueValue(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashOpaqueValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomOpaqueValue(48);
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  };
}
