import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.env === 'production' ? config.rateLimit.maxRequests : 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 10 : 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

function identityLimiter(windowMs: number, productionMax: number, message: string) {
  return rateLimit({
    windowMs,
    max: config.env === 'production' ? productionMax : 100000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message } },
  });
}

export const recoveryLimiter = identityLimiter(60 * 60 * 1000, 5, 'Too many account recovery attempts');
export const otpLimiter = identityLimiter(10 * 60 * 1000, 10, 'Too many verification attempts');
export const invitationLimiter = identityLimiter(60 * 60 * 1000, 20, 'Too many invitation requests');
export const tokenLimiter = identityLimiter(15 * 60 * 1000, 30, 'Too many token requests');
export const billingLimiter = identityLimiter(15 * 60 * 1000, 20, 'Too many billing requests');
export const webhookLimiter = identityLimiter(15 * 60 * 1000, 1000, 'Too many webhook requests');
