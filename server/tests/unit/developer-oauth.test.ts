import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSecret } from "../../src/modules/identity/crypto.js";
import { pkceChallenge } from "../../src/modules/developer/security.js";

const mocks = vi.hoisted(() => ({
  applicationFindOne: vi.fn(),
  applicationUpdateOne: vi.fn(),
  codeFindOne: vi.fn(),
  codeUpdateOne: vi.fn(),
  tokenCreate: vi.fn(),
  tokenFindOne: vi.fn(),
  tokenUpdateOne: vi.fn(),
}));

vi.mock("../../src/modules/developer/model.js", () => ({
  DeveloperApplication: {
    findOne: mocks.applicationFindOne,
    updateOne: mocks.applicationUpdateOne,
  },
  OAuthAuthorizationCode: {
    findOne: mocks.codeFindOne,
    updateOne: mocks.codeUpdateOne,
  },
  OAuthToken: {
    create: mocks.tokenCreate,
    findOne: mocks.tokenFindOne,
    updateOne: mocks.tokenUpdateOne,
  },
}));

vi.mock("../../src/modules/auth/repository.js", () => ({
  userRepository: {},
  workspaceRepository: {},
}));

import { developerOAuthService } from "../../src/modules/developer/oauthService.js";

function chain<T>(value: T) {
  return { select: () => ({ exec: async () => value }), exec: async () => value };
}

describe("developer OAuth token lifecycle", () => {
  const clientSecret = "nxcsec_public.this-is-a-long-confidential-secret"; // secret-scan:allow synthetic OAuth fixture
  const application = {
    _id: { toString: () => "507f1f77bcf86cd799439011" },
    workspaceId: { toString: () => "507f1f77bcf86cd799439012" },
    clientId: "nxc_test-client",
    clientSecretHash: hashSecret(clientSecret),
    scopes: ["analytics.read", "reports.read"],
    grantTypes: ["authorization_code", "client_credentials"],
    status: "active",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applicationFindOne.mockReturnValue(chain(application));
    mocks.applicationUpdateOne.mockReturnValue({ exec: async () => ({ modifiedCount: 1 }) });
    mocks.tokenCreate.mockImplementation(async (value) => ({ ...value, _id: { toString: () => "507f1f77bcf86cd799439013" } }));
    mocks.tokenUpdateOne.mockReturnValue({ exec: async () => ({ modifiedCount: 1 }) });
  });

  it("issues a scoped machine token without persisting the raw secret", async () => {
    const token = await developerOAuthService.clientCredentials({
      clientId: application.clientId,
      clientSecret,
      requestedScopes: ["analytics.read"],
    });
    expect(token.access_token).toMatch(/^nxo_/);
    expect(token.refresh_token).toBeUndefined();
    expect(token.scope).toBe("analytics.read");
    const persisted = mocks.tokenCreate.mock.calls[0]?.[0];
    expect(persisted.accessSecretHash).toMatch(/^[a-f\d]{64}$/);
    expect(token.access_token).not.toContain(persisted.accessSecretHash);
  });

  it("consumes a PKCE authorization code once and issues rotated refresh credentials", async () => {
    const codeSecret = "authorization-code-secret-that-is-long-enough";
    const code = `nxc_publiccode.${codeSecret}`;
    const verifier = "verifier-value-that-is-at-least-forty-three-characters-long";
    mocks.codeFindOne.mockReturnValue(chain({
      _id: { toString: () => "507f1f77bcf86cd799439014" },
      applicationId: application._id,
      userId: { toString: () => "507f1f77bcf86cd799439015" },
      redirectUri: "https://client.example/callback",
      scopes: ["reports.read"],
      codeChallenge: pkceChallenge(verifier),
      secretHash: hashSecret(codeSecret),
      expiresAt: new Date(Date.now() + 60_000),
    }));
    mocks.codeUpdateOne.mockReturnValue({ exec: async () => ({ modifiedCount: 1 }) });
    const token = await developerOAuthService.exchangeAuthorizationCode({
      clientId: application.clientId,
      clientSecret,
      code,
      redirectUri: "https://client.example/callback",
      codeVerifier: verifier,
    });
    expect(token.access_token).toMatch(/^nxo_/);
    expect(token.refresh_token).toMatch(/^nxr_/);
    expect(mocks.codeUpdateOne).toHaveBeenCalledOnce();
  });
});
