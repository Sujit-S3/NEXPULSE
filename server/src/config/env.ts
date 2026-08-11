import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function isThirtyTwoByteKey(value: string | undefined): boolean {
  if (!value) return false;
  if (/^[a-fA-F0-9]{64}$/.test(value)) return true;
  try {
    return Buffer.from(value, 'base64').length === 32;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().default('NEXPULSE AI'),
  APP_URL: z.string().default('http://localhost:4000'),
  CLIENT_URL: z.string().default('http://localhost:5174'),

  // Database
  MONGO_URI: z.string().url().default('mongodb://localhost:27017/nexpulse'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),

  // Cookies
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Identity
  IDENTITY_ENCRYPTION_KEY: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
  ),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
  SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  TRUSTED_DEVICE_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  JWT_ISSUER: z.string().default('nexpulse-api'),
  JWT_AUDIENCE: z.string().default('nexpulse-web'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5174').transform(
  (s) => s.split(',').map((x) => x.trim()).filter(Boolean),
),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Redis / background job queue
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  ENABLE_QUEUES: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // AI Providers
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEFAULT_AI_PROVIDER: z.enum(['auto', 'gemini', 'openai', 'anthropic']).default('auto'),

  // Social OAuth providers. A provider is exposed to the client only when
  // both credentials and OAUTH_TOKEN_ENCRYPTION_KEY are configured.
  OAUTH_TOKEN_ENCRYPTION_KEY: z.string()
    .refine(isThirtyTwoByteKey, 'OAUTH_TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes')
    .optional(),
  OAUTH_SESSION_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  META_CLIENT_ID: z.string().optional(),
  META_CLIENT_SECRET: z.string().optional(),
  META_GRAPH_VERSION: z.string().default('v23.0'),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_API_VERSION: z.string().default('202607'),
  LINKEDIN_OAUTH_SCOPES: z
    .string()
    .default('openid profile w_member_social r_organization_social rw_organization_admin'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  PINTEREST_CLIENT_ID: z.string().optional(),
  PINTEREST_CLIENT_SECRET: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),

  // Email (Future)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Billing
  ENABLE_BILLING: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  RAZORPAY_KEY_ID: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().regex(/^rzp_(?:test|live)_[A-Za-z0-9]+$/).optional(),
  ),
  RAZORPAY_KEY_SECRET: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().min(8).optional(),
  ),
  RAZORPAY_WEBHOOK_SECRET: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().min(16).optional(),
  ),
  RAZORPAY_PROFESSIONAL_MONTHLY_PLAN_ID: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().regex(/^plan_[A-Za-z0-9]{14}$/).optional(),
  ),
  RAZORPAY_PROFESSIONAL_ANNUAL_PLAN_ID: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().regex(/^plan_[A-Za-z0-9]{14}$/).optional(),
  ),
  RAZORPAY_CURRENCY: z.string().length(3).default('INR').transform((value) => value.toUpperCase()),
  RAZORPAY_PROFESSIONAL_MONTHLY_PRICE_MINOR: z.coerce.number().int().positive().default(399900),
  RAZORPAY_PROFESSIONAL_ANNUAL_PRICE_MINOR: z.coerce.number().int().positive().default(3838800),

  // Rate Limit
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Operations
  METRICS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  OPERATIONS_MONITOR_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  OPERATIONS_ALERT_WEBHOOK_URL: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().url().optional(),
  ),
  OPERATIONS_CHECK_INTERVAL_MS: z.coerce.number().int().min(30_000).max(3_600_000).default(300_000),
  OPERATIONS_ALERT_COOLDOWN_MS: z.coerce.number().int().min(60_000).max(86_400_000).default(1_800_000),

  // Feature Flags
  ENABLE_AI: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  ENABLE_PLATFORM_SYNC: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  ENABLE_EMAIL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  ENABLE_ANALYTICS: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  TRUST_PROXY: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // Deployment
  RENDER_EXTERNAL_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),

  // Version
  API_VERSION: z.string().default('v1'),
}).superRefine((environment, context) => {
  if (environment.NODE_ENV !== 'production') return;

  if (!environment.IDENTITY_ENCRYPTION_KEY) {
    context.addIssue({ code: 'custom', path: ['IDENTITY_ENCRYPTION_KEY'], message: 'Identity encryption is required in production' });
  }

  const aiKeys = {
    gemini: environment.GEMINI_API_KEY,
    openai: environment.OPENAI_API_KEY,
    anthropic: environment.ANTHROPIC_API_KEY,
  };
  if (environment.ENABLE_AI && !Object.values(aiKeys).some(Boolean)) {
    context.addIssue({
      code: 'custom',
      path: ['ENABLE_AI'],
      message: 'At least one AI provider key is required when AI is enabled in production',
    });
  }
  if (
    environment.ENABLE_AI
    && environment.DEFAULT_AI_PROVIDER !== 'auto'
    && !aiKeys[environment.DEFAULT_AI_PROVIDER]
  ) {
    context.addIssue({
      code: 'custom',
      path: ['DEFAULT_AI_PROVIDER'],
      message: `DEFAULT_AI_PROVIDER=${environment.DEFAULT_AI_PROVIDER} requires its matching API key`,
    });
  }

  const oauthPairs = [
    [environment.META_CLIENT_ID, environment.META_CLIENT_SECRET],
    [environment.LINKEDIN_CLIENT_ID, environment.LINKEDIN_CLIENT_SECRET],
    [environment.GOOGLE_CLIENT_ID, environment.GOOGLE_CLIENT_SECRET],
    [environment.TIKTOK_CLIENT_KEY, environment.TIKTOK_CLIENT_SECRET],
    [environment.PINTEREST_CLIENT_ID, environment.PINTEREST_CLIENT_SECRET],
    [environment.X_CLIENT_ID, environment.X_CLIENT_SECRET],
  ];
  if (
    environment.ENABLE_PLATFORM_SYNC
    && (!isThirtyTwoByteKey(environment.OAUTH_TOKEN_ENCRYPTION_KEY)
      || !oauthPairs.some(([clientId, clientSecret]) => clientId && clientSecret))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['ENABLE_PLATFORM_SYNC'],
      message: 'OAuth token encryption and at least one complete provider credential pair are required when platform sync is enabled in production',
    });
  }

  if (
    environment.ENABLE_EMAIL
    && ![
      environment.SMTP_HOST,
      environment.SMTP_USER,
      environment.SMTP_PASSWORD,
      environment.SMTP_FROM,
    ].every(Boolean)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['ENABLE_EMAIL'],
      message: 'SMTP host, user, password, and from address are required when email is enabled in production',
    });
  }

  if (
    environment.ENABLE_BILLING
    && ![
      environment.RAZORPAY_KEY_ID,
      environment.RAZORPAY_KEY_SECRET,
      environment.RAZORPAY_WEBHOOK_SECRET,
      environment.RAZORPAY_PROFESSIONAL_MONTHLY_PLAN_ID,
      environment.RAZORPAY_PROFESSIONAL_ANNUAL_PLAN_ID,
    ].every(Boolean)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['ENABLE_BILLING'],
      message: 'Razorpay credentials, webhook secret, and monthly/annual plan IDs are required when billing is enabled',
    });
  }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  const { fieldErrors } = result.error.flatten();
  for (const [key, messages] of Object.entries(fieldErrors)) {
    console.error(`  ${key}: ${messages?.join(', ')}`);
  }
  process.exit(1);
}

export const config = {
  env: result.data.NODE_ENV,
  port: result.data.PORT,
  app: {
    name: result.data.APP_NAME,
    url: result.data.APP_URL,
    clientUrl: result.data.CLIENT_URL,
  },
  mongoUri: result.data.MONGO_URI,
  jwt: {
    accessSecret: result.data.JWT_ACCESS_SECRET,
    accessExpiresIn: result.data.JWT_ACCESS_EXPIRES_IN,
    issuer: result.data.JWT_ISSUER,
    audience: result.data.JWT_AUDIENCE,
  },
  cookie: {
    secret: result.data.COOKIE_SECRET,
    secure: result.data.NODE_ENV === 'production' ? true : result.data.COOKIE_SECURE,
    sameSite: result.data.COOKIE_SAME_SITE,
  },
  cors: {
    origin: result.data.CORS_ORIGIN,
  },
  cloudinary: {
    cloudName: result.data.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: result.data.CLOUDINARY_API_KEY ?? '',
    apiSecret: result.data.CLOUDINARY_API_SECRET ?? '',
  },
  redisUrl: result.data.REDIS_URL,
  ai: {
    geminiApiKey: result.data.GEMINI_API_KEY,
    openaiApiKey: result.data.OPENAI_API_KEY,
    anthropicApiKey: result.data.ANTHROPIC_API_KEY,
    defaultProvider: result.data.DEFAULT_AI_PROVIDER,
  },
  oauth: {
    tokenEncryptionKey: result.data.OAUTH_TOKEN_ENCRYPTION_KEY,
    sessionTtlMinutes: result.data.OAUTH_SESSION_TTL_MINUTES,
    meta: {
      clientId: result.data.META_CLIENT_ID,
      clientSecret: result.data.META_CLIENT_SECRET,
      graphVersion: result.data.META_GRAPH_VERSION,
    },
    linkedin: {
      clientId: result.data.LINKEDIN_CLIENT_ID,
      clientSecret: result.data.LINKEDIN_CLIENT_SECRET,
      apiVersion: result.data.LINKEDIN_API_VERSION,
      scopes: result.data.LINKEDIN_OAUTH_SCOPES.split(/[,\s]+/).filter(Boolean),
    },
    google: {
      clientId: result.data.GOOGLE_CLIENT_ID,
      clientSecret: result.data.GOOGLE_CLIENT_SECRET,
    },
    tiktok: {
      clientKey: result.data.TIKTOK_CLIENT_KEY,
      clientSecret: result.data.TIKTOK_CLIENT_SECRET,
    },
    pinterest: {
      clientId: result.data.PINTEREST_CLIENT_ID,
      clientSecret: result.data.PINTEREST_CLIENT_SECRET,
    },
    x: {
      clientId: result.data.X_CLIENT_ID,
      clientSecret: result.data.X_CLIENT_SECRET,
    },
  },
  email: {
    host: result.data.SMTP_HOST,
    port: result.data.SMTP_PORT,
    user: result.data.SMTP_USER,
    password: result.data.SMTP_PASSWORD,
    from: result.data.SMTP_FROM,
  },
  billing: {
    enabled: result.data.ENABLE_BILLING,
    razorpay: {
      keyId: result.data.RAZORPAY_KEY_ID,
      keySecret: result.data.RAZORPAY_KEY_SECRET,
      webhookSecret: result.data.RAZORPAY_WEBHOOK_SECRET,
      currency: result.data.RAZORPAY_CURRENCY,
      professional: {
        monthlyPlanId: result.data.RAZORPAY_PROFESSIONAL_MONTHLY_PLAN_ID,
        annualPlanId: result.data.RAZORPAY_PROFESSIONAL_ANNUAL_PLAN_ID,
        monthlyPriceMinor: result.data.RAZORPAY_PROFESSIONAL_MONTHLY_PRICE_MINOR,
        annualPriceMinor: result.data.RAZORPAY_PROFESSIONAL_ANNUAL_PRICE_MINOR,
      },
    },
  },
  rateLimit: {
    windowMs: result.data.RATE_LIMIT_WINDOW_MS,
    maxRequests: result.data.RATE_LIMIT_MAX_REQUESTS,
  },
  logLevel: result.data.LOG_LEVEL,
  operations: {
    metricsEnabled: result.data.METRICS_ENABLED,
    monitorEnabled: result.data.OPERATIONS_MONITOR_ENABLED,
    alertWebhookUrl: result.data.OPERATIONS_ALERT_WEBHOOK_URL,
    checkIntervalMs: result.data.OPERATIONS_CHECK_INTERVAL_MS,
    alertCooldownMs: result.data.OPERATIONS_ALERT_COOLDOWN_MS,
  },
  features: {
    ai: result.data.ENABLE_AI,
    platformSync: result.data.ENABLE_PLATFORM_SYNC,
    email: result.data.ENABLE_EMAIL,
    analytics: result.data.ENABLE_ANALYTICS,
    billing: result.data.ENABLE_BILLING,
    queues: result.data.ENABLE_QUEUES,
  },
  security: {
    bcryptRounds: result.data.BCRYPT_ROUNDS,
    trustProxy: result.data.NODE_ENV === 'production' ? true : result.data.TRUST_PROXY,
  },
  identity: {
    encryptionKey: result.data.IDENTITY_ENCRYPTION_KEY,
    sessionIdleTimeoutMinutes: result.data.SESSION_IDLE_TIMEOUT_MINUTES,
    sessionMaxDays: result.data.SESSION_MAX_DAYS,
    trustedDeviceDays: result.data.TRUSTED_DEVICE_DAYS,
  },
  deployment: {
    renderExternalUrl: result.data.RENDER_EXTERNAL_URL,
    vercelUrl: result.data.VERCEL_URL,
  },
  apiVersion: result.data.API_VERSION,
};

export type Config = typeof config;
