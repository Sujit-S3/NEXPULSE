import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

vi.mock("../../src/config/env.js", () => ({
  config: {
    env: "test",
    port: 4001,
    app: {
      name: "NEXPULSE AI",
      url: "http://localhost:4000",
      clientUrl: "http://localhost:5173",
    },
    mongoUri: "mongodb://localhost:27017/nexpulse-test",
    jwt: {
      accessSecret: "test-access-secret",
      refreshSecret: "test-refresh-secret",
      accessExpiresIn: "15m",
      refreshExpiresIn: "7d",
      issuer: "nexpulse-test",
      audience: "nexpulse-test-client",
    },
    cookie: {
      secret: "test-cookie-secret",
      secure: false,
      sameSite: "lax" as const,
    },
    cors: {
      origin: "[http://localhost:5173]",
    },
    cloudinary: {
      cloudName: "",
      apiKey: "",
      apiSecret: "",
    },
    redisUrl: undefined,
    ai: {
      geminiApiKey: undefined,
      openaiApiKey: undefined,
      anthropicApiKey: undefined,
      defaultProvider: "auto" as const,
    },
    oauth: {
      tokenEncryptionKey: undefined,
      sessionTtlMinutes: 15,
      meta: { clientId: undefined, clientSecret: undefined, graphVersion: "v23.0" },
      linkedin: { clientId: undefined, clientSecret: undefined, apiVersion: "202607", scopes: [] },
      google: { clientId: undefined, clientSecret: undefined },
      tiktok: { clientKey: undefined, clientSecret: undefined },
      pinterest: { clientId: undefined, clientSecret: undefined },
      x: { clientId: undefined, clientSecret: undefined },
    },
    email: {
      host: undefined,
      port: 587,
      user: undefined,
      password: undefined,
      from: undefined,
    },
    billing: {
      enabled: false,
      razorpay: {
        keyId: undefined,
        keySecret: undefined,
        webhookSecret: undefined,
        currency: "INR",
        professional: {
          monthlyPlanId: undefined,
          annualPlanId: undefined,
          monthlyPriceMinor: 399900,
          annualPriceMinor: 3838800,
        },
      },
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
    },
    logLevel: "silent",
    operations: {
      metricsEnabled: true,
      monitorEnabled: true,
      alertWebhookUrl: undefined,
      checkIntervalMs: 300000,
      alertCooldownMs: 1800000,
    },
    features: {
      ai: true,
      platformSync: true,
      email: false,
      analytics: true,
      billing: false,
    },
    security: {
      bcryptRounds: 12,
      trustProxy: false,
    },
    identity: {
      encryptionKey: "11".repeat(32),
      sessionIdleTimeoutMinutes: 60,
      sessionMaxDays: 30,
      trustedDeviceDays: 30,
    },
    deployment: {
      renderExternalUrl: undefined,
      vercelUrl: undefined,
    },
    apiVersion: "v1",
  },
}));

vi.mock("../../src/middleware/morgan.js", () => ({
  morganMiddleware: (req: any, res: any, next: () => void) => next(),
}));

vi.mock("../../src/logger/index.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/routes.js", () => {
  const { Router } = require("express");
  return { authRoutes: Router() };
});

vi.mock("../../src/modules/platforms/routes.js", () => {
  const { Router } = require("express");
  return { platformRoutes: Router() };
});

vi.mock("../../src/modules/ai/routes.js", () => {
  const { Router } = require("express");
  return { aiRoutes: Router() };
});

vi.mock("../../src/modules/analytics/routes.js", () => {
  const { Router } = require("express");
  return { analyticsRoutes: Router() };
});
vi.mock("../../src/modules/dashboard/routes.js", () => {
  const { Router } = require("express");
  return { dashboardRoutes: Router() };
});
vi.mock("../../src/modules/reports/routes.js", () => {
  const { Router } = require("express");
  return { reportRoutes: Router() };
});
vi.mock("../../src/modules/notifications/routes.js", () => {
  const { Router } = require("express");
  return { notificationRoutes: Router() };
});
vi.mock("../../src/modules/settings/routes.js", () => {
  const { Router } = require("express");
  return { settingsRoutes: Router() };
});
vi.mock("../../src/modules/workspaces/routes.js", () => {
  const { Router } = require("express");
  return { workspaceRoutes: Router() };
});
vi.mock("../../src/modules/identity/routes.js", () => {
  const { Router } = require("express");
  return { identityRoutes: Router() };
});

vi.mock("../../src/modules/developer/routes.js", () => {
  const { Router } = require("express");
  return { developerRoutes: Router(), developerOAuthRoutes: Router() };
});

vi.mock("../../src/modules/developer/publicResources.js", () => {
  const { Router } = require("express");
  return { publicResourceRoutes: Router() };
});

vi.mock("../../src/modules/security/routes.js", () => {
  const { Router } = require("express");
  return { securityRoutes: Router() };
});

vi.mock("../../src/modules/billing/routes.js", () => {
  const { Router } = require("express");
  return { billingRoutes: Router() };
});

vi.mock("../../src/modules/developer/usageService.js", () => ({
  apiGatewayIngress: (_req: any, _res: any, next: () => void) => next(),
}));

vi.mock("../../src/routes/v1/ready.routes.js", () => {
  const { Router } = require("express");
  return { readyRoutes: Router() };
});

vi.mock("../../src/database/index.js", () => ({
  connectDatabase: vi.fn().mockResolvedValue(undefined),
  disconnectDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("mongoose", () => {
  const mockModel = {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockConnection = {
    readyState: 1,
    close: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    collection: vi.fn(() => ({ drop: vi.fn() })),
    dropDatabase: vi.fn(),
  };

  return {
    default: {
      connect: vi.fn().mockResolvedValue(mockConnection),
      connection: mockConnection,
      model: vi.fn(() => mockModel),
      Schema: class MockSchema {
        constructor(schema: any) { return schema; }
        index() {}
      },
      Types: { ObjectId: { from: () => "507f1f77bcf86cd799439011" } },
      disconnect: vi.fn().mockResolvedValue(undefined),
    },
    connect: vi.fn().mockResolvedValue(mockConnection),
    connection: mockConnection,
    model: vi.fn(() => mockModel),
    Schema: class MockSchema {
      constructor(schema: any) { return schema; }
      index() {}
    },
    Types: { ObjectId: { from: () => "507f1f77bcf86cd799439011" } },
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Health API", () => {
  let app: any;

  beforeAll(async () => {
    const mod = await import("../../src/app.js");
    app = mod.app;
  });

  describe("GET /api/v1/health", () => {
    it("returns 200 with success response", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success");
      expect(res.body).toHaveProperty("data");
    });

    it("returns healthy status in data", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.body.data.status).toBe("healthy");
      expect(res.body.data).toHaveProperty("environment");
      expect(res.body.data).toHaveProperty("database");
    });

    it("includes uptime in seconds", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.body.data).toHaveProperty("uptime");
      expect(typeof res.body.data.uptime).toBe("number");
    });
  });

  describe("GET /api/openapi.json", () => {
    it("publishes the versioned public API contract", async () => {
      const res = await request(app).get("/api/openapi.json");
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe("3.1.0");
      expect(res.body.paths).toHaveProperty("/oauth/token");
      expect(res.body.paths).toHaveProperty("/developer/webhooks");
    });
  });

  describe("GET /", () => {
    it("sends browser traffic to the product client", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(307);
      expect(res.headers.location).toBe("http://localhost:5173");
    });

    it("preserves client-side routes when browser traffic reaches the API port", async () => {
      const res = await request(app).get("/dashboard?source=direct");
      expect(res.status).toBe(307);
      expect(res.headers.location).toBe("http://localhost:5173/dashboard?source=direct");
    });
  });

  describe("404 handling", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await request(app).get("/api/v1/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("CORS headers", () => {
    it("includes CORS headers in response", async () => {
      const res = await request(app).options("/api/v1/health");
      expect(res.headers["access-control-allow-origin"]).toBeDefined();
    });
  });
});
