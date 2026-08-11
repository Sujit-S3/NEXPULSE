import crypto from 'node:crypto';
import { config } from '../../config/env.js';
import { AppError } from '../../errors/index.js';

export function randomSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function safeSecretEqual(expectedHash: string, value: string): boolean {
  const actual = Buffer.from(hashSecret(value), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function encryptionKey(): Buffer {
  const encoded = config.identity.encryptionKey;
  if (!encoded) {
    throw new AppError(
      'Identity secret encryption is not configured.',
      503,
      'IDENTITY_ENCRYPTION_NOT_CONFIGURED',
    );
  }
  const key = Buffer.from(encoded, 'hex');
  if (key.length !== 32) {
    throw new AppError(
      'Identity encryption key must be 32 bytes encoded as 64 hexadecimal characters.',
      503,
      'IDENTITY_ENCRYPTION_INVALID',
    );
  }
  return key;
}

export function encryptIdentitySecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptIdentitySecret(envelope: string): string {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = envelope.split('.');
  if (version !== 'v1' || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new AppError('Identity secret envelope is invalid.', 500, 'IDENTITY_SECRET_INVALID');
  }
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivEncoded, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new AppError('Identity secret could not be decrypted.', 500, 'IDENTITY_SECRET_INVALID');
  }
}
