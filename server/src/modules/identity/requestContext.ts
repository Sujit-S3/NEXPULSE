import type { Request } from 'express';
import { deviceCookieName } from '../../utils/jwt.js';
import { hashSecret, randomSecret } from './crypto.js';

export interface IdentityRequestContext {
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
  deviceName: string;
  deviceId: string;
  deviceIdHash: string;
  location?: { country?: string; region?: string; city?: string };
  requestId?: string;
}

function browser(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Chrome\//i.test(userAgent)) return 'Chrome';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
  return 'Unknown browser';
}

function os(userAgent: string): string {
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iOS/i.test(userAgent)) return 'iOS';
  if (/Mac OS/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Unknown OS';
}

function deviceType(userAgent: string): string {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export function identityRequestContext(req: Request): IdentityRequestContext {
  const userAgent = String(req.headers['user-agent'] ?? 'Unknown user agent').slice(0, 1000);
  const existingDeviceId = req.cookies?.[deviceCookieName()];
  const deviceId = typeof existingDeviceId === 'string' && existingDeviceId.length >= 20
    ? existingDeviceId
    : randomSecret(24);
  const detectedBrowser = browser(userAgent);
  const detectedOs = os(userAgent);
  const countryHeader = req.headers['cf-ipcountry'];
  const country = typeof countryHeader === 'string' && /^[A-Z]{2}$/i.test(countryHeader)
    ? countryHeader.toUpperCase()
    : undefined;
  return {
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent,
    browser: detectedBrowser,
    os: detectedOs,
    deviceType: deviceType(userAgent),
    deviceName: `${detectedBrowser} on ${detectedOs}`,
    deviceId,
    deviceIdHash: hashSecret(deviceId),
    location: country ? { country } : undefined,
    requestId: req.id,
  };
}
