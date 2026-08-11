import { afterAll, beforeAll, vi } from "vitest";

vi.mock("../src/env.ts", () => ({
  env: {
    PORT: 4001,
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://localhost:27017/nexpulse-test",
    JWT_SECRET: "test-secret-key",
    JWT_EXPIRES_IN: "7d",
    CORS_ORIGIN: "http://localhost:5173",
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX: 100,
    LOG_LEVEL: "silent",
  },
}));

vi.mock("winston", () => {
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  };
  return {
    createLogger: () => logger,
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      json: vi.fn(),
      colorize: vi.fn(),
      simple: vi.fn(),
      printf: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn(),
    },
    default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
});

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
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    insertMany: vi.fn(),
    bulkWrite: vi.fn(),
    distinct: vi.fn(),
  };

  const mockConnection = {
    readyState: 1,
    close: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    collection: vi.fn(() => ({
      drop: vi.fn(),
    })),
    dropDatabase: vi.fn(),
  };

  return {
    default: {
      connect: vi.fn().mockResolvedValue(mockConnection),
      connection: mockConnection,
      model: vi.fn(() => mockModel),
      Schema: class MockSchema {
        static Types = {
          ObjectId: class MockObjectId {},
          Mixed: class MockMixed {},
        };
        constructor(schema: any, options?: any) {
          return schema;
        }
        index() {}
        static schema = {};
      },
      Types: {
        ObjectId: {
          from() {
            return "507f1f77bcf86cd799439011";
          },
        },
      },
      disconnect: vi.fn().mockResolvedValue(undefined),
    },
    connect: vi.fn().mockResolvedValue(mockConnection),
    connection: mockConnection,
    model: vi.fn(() => mockModel),
    Schema: class MockSchema {
      static Types = {
        ObjectId: class MockObjectId {},
        Mixed: class MockMixed {},
      };
      constructor(schema: any, options?: any) {
        return schema;
      }
      index() {}
      static schema = {};
    },
    Types: {
      ObjectId: {
        from() {
          return "507f1f77bcf86cd799439011";
        },
      },
    },
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
});
