import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import type { JwtPayload } from '../modules/auth/types.js';

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    jwtid: uuidv4(),
  }) as string;
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.accessSecret, {
    algorithms: ['HS256'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  }) as JwtPayload;
}

export function getCookieOptions(rememberMe = false) {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/v1/auth',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined,
  };
}

export function refreshCookieName(): string {
  return config.env === 'production' ? '__Secure-nexpulse_refresh' : 'nexpulse_refresh';
}

export function deviceCookieName(): string {
  return config.env === 'production' ? '__Secure-nexpulse_device' : 'nexpulse_device';
}

export function getDeviceCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
    maxAge: config.identity.trustedDeviceDays * 24 * 60 * 60 * 1000,
  };
}
