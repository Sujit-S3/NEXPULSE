import type { Permission } from '../identity/permissions.js';
import { effectivePermissions } from '../identity/permissions.js';
import { hashSecret, safeSecretEqual } from '../identity/crypto.js';
import { userRepository, workspaceRepository } from '../auth/repository.js';
import { AuthenticationError, AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../errors/index.js';
import type { IdentityRequestContext } from '../identity/requestContext.js';
import {
  DeveloperApplication,
  OAuthAuthorizationCode,
  OAuthToken,
  type DeveloperGrantType,
  type IDeveloperApplication,
} from './model.js';
import { opaqueCredential, parseOpaqueCredential, verifyPkce } from './security.js';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000;

function publicApplication(application: IDeveloperApplication) {
  return {
    id: application._id.toString(),
    name: application.name,
    description: application.description,
    clientId: application.clientId,
    redirectUris: application.redirectUris,
    scopes: application.scopes,
    grantTypes: application.grantTypes,
    status: application.status,
    lastUsedAt: application.lastUsedAt?.toISOString(),
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

function uniqueScopes(scopes: readonly string[]): Permission[] {
  return Array.from(new Set(scopes)) as Permission[];
}

function assertGrantedScopes(
  requested: readonly string[],
  applicationScopes: readonly Permission[],
  actorPermissions?: readonly Permission[],
): Permission[] {
  const allowedByApplication = new Set<string>(applicationScopes);
  const allowedByActor = actorPermissions ? new Set<string>(actorPermissions) : undefined;
  const invalid = requested.find((scope) => !allowedByApplication.has(scope));
  const elevated = requested.find((scope) => allowedByActor && !allowedByActor.has(scope));
  if (invalid || elevated) {
    throw new AuthorizationError(`Scope is not available to this grant: ${invalid ?? elevated}`);
  }
  if (requested.length === 0) throw new ValidationError({ scope: ['At least one scope is required'] });
  return uniqueScopes(requested);
}

async function authenticatedApplication(clientId: string, clientSecret: string) {
  const application = await DeveloperApplication.findOne({ clientId, status: 'active' })
    .select('+clientSecretHash')
    .exec();
  if (!application || !safeSecretEqual(application.clientSecretHash, clientSecret)) {
    throw new AuthenticationError('Invalid OAuth client credentials');
  }
  return application;
}

function issueCredentials(includeRefresh: boolean) {
  return {
    access: opaqueCredential('nxo'),
    refresh: includeRefresh ? opaqueCredential('nxr') : undefined,
  };
}

async function persistToken(input: {
  application: IDeveloperApplication;
  userId?: string;
  scopes: Permission[];
  grantType: 'authorization_code' | 'client_credentials';
}) {
  const credentials = issueCredentials(input.grantType === 'authorization_code');
  const now = Date.now();
  const token = await OAuthToken.create({
    applicationId: input.application._id,
    workspaceId: input.application.workspaceId,
    userId: input.userId,
    accessPrefix: credentials.access.prefix,
    accessSecretHash: hashSecret(credentials.access.secret),
    refreshPrefix: credentials.refresh?.prefix,
    refreshSecretHash: credentials.refresh ? hashSecret(credentials.refresh.secret) : undefined,
    scopes: input.scopes,
    grantType: input.grantType,
    expiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    refreshExpiresAt: credentials.refresh ? new Date(now + REFRESH_TOKEN_TTL_MS) : undefined,
  });
  await DeveloperApplication.updateOne({ _id: input.application._id }, { $set: { lastUsedAt: new Date() } }).exec();
  return {
    access_token: credentials.access.raw,
    token_type: 'Bearer' as const,
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: credentials.refresh?.raw,
    scope: input.scopes.join(' '),
    token_id: token._id.toString(),
  };
}

export const developerOAuthService = {
  async registerApplication(input: {
    workspaceId: string;
    ownerId: string;
    actorPermissions: Permission[];
    name: string;
    description?: string;
    redirectUris: string[];
    scopes: string[];
    grantTypes: DeveloperGrantType[];
  }) {
    const scopes = assertGrantedScopes(input.scopes, input.actorPermissions, input.actorPermissions);
    const secret = opaqueCredential('nxcsec');
    const clientId = `nxc_${opaqueCredential('app').prefix.slice(4)}`;
    try {
      const application = await DeveloperApplication.create({
        workspaceId: input.workspaceId,
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        clientId,
        clientSecretHash: hashSecret(secret.raw),
        redirectUris: input.redirectUris,
        scopes,
        grantTypes: Array.from(new Set(input.grantTypes)),
      });
      return {
        application: publicApplication(application),
        clientSecret: secret.raw,
      };
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
        throw new ConflictError('An application with this name already exists in the workspace');
      }
      throw error;
    }
  },

  async listApplications(workspaceId: string) {
    const applications = await DeveloperApplication.find({ workspaceId }).sort({ createdAt: -1 }).exec();
    return applications.map(publicApplication);
  },

  async rotateSecret(workspaceId: string, applicationId: string) {
    const secret = opaqueCredential('nxcsec');
    const application = await DeveloperApplication.findOneAndUpdate(
      { _id: applicationId, workspaceId, status: { $ne: 'revoked' } },
      { $set: { clientSecretHash: hashSecret(secret.raw) } },
      { new: true },
    ).exec();
    if (!application) throw new NotFoundError('Developer application not found');
    await OAuthToken.updateMany(
      { applicationId: application._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revokeReason: 'client_secret_rotated' } },
    ).exec();
    return { application: publicApplication(application), clientSecret: secret.raw };
  },

  async revokeApplication(workspaceId: string, applicationId: string) {
    const application = await DeveloperApplication.findOneAndUpdate(
      { _id: applicationId, workspaceId, status: { $ne: 'revoked' } },
      { $set: { status: 'revoked' } },
      { new: true },
    ).exec();
    if (!application) throw new NotFoundError('Developer application not found');
    await OAuthToken.updateMany(
      { applicationId: application._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revokeReason: 'application_revoked' } },
    ).exec();
  },

  async consentDetails(input: {
    clientId: string;
    redirectUri: string;
    requestedScopes: string[];
    actorPermissions: Permission[];
  }) {
    const application = await DeveloperApplication.findOne({ clientId: input.clientId, status: 'active' }).exec();
    if (!application || !application.redirectUris.includes(input.redirectUri)) {
      throw new ValidationError({ client_id: ['Unknown client or redirect URI'] });
    }
    const scopes = assertGrantedScopes(input.requestedScopes, application.scopes, input.actorPermissions);
    return { application: publicApplication(application), requestedScopes: scopes };
  },

  async authorize(input: {
    clientId: string;
    redirectUri: string;
    requestedScopes: string[];
    codeChallenge: string;
    state: string;
    userId: string;
    workspaceId: string;
    actorPermissions: Permission[];
  }) {
    const application = await DeveloperApplication.findOne({
      clientId: input.clientId,
      workspaceId: input.workspaceId,
      status: 'active',
    }).exec();
    if (!application || !application.redirectUris.includes(input.redirectUri)) {
      throw new ValidationError({ redirect_uri: ['Redirect URI is not registered for this application'] });
    }
    if (!application.grantTypes.includes('authorization_code')) {
      throw new AuthorizationError('Authorization code grants are disabled for this application');
    }
    const scopes = assertGrantedScopes(input.requestedScopes, application.scopes, input.actorPermissions);
    const code = opaqueCredential('nxc');
    await OAuthAuthorizationCode.create({
      applicationId: application._id,
      workspaceId: application.workspaceId,
      userId: input.userId,
      prefix: code.prefix,
      secretHash: hashSecret(code.secret),
      redirectUri: input.redirectUri,
      scopes,
      codeChallenge: input.codeChallenge,
      expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
    });
    const redirect = new URL(input.redirectUri);
    redirect.searchParams.set('code', code.raw);
    redirect.searchParams.set('state', input.state);
    return { code: code.raw, state: input.state, redirectTo: redirect.toString(), expiresIn: 600 };
  },

  async exchangeAuthorizationCode(input: {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }) {
    const application = await authenticatedApplication(input.clientId, input.clientSecret);
    const parsed = parseOpaqueCredential(input.code, 'nxc');
    if (!parsed) throw new AuthenticationError('Invalid authorization code');
    const code = await OAuthAuthorizationCode.findOne({ prefix: parsed.prefix }).select('+secretHash').exec();
    if (
      !code || code.applicationId.toString() !== application._id.toString() || code.usedAt
      || code.expiresAt <= new Date() || code.redirectUri !== input.redirectUri
      || !safeSecretEqual(code.secretHash, parsed.secret) || !verifyPkce(input.codeVerifier, code.codeChallenge)
    ) throw new AuthenticationError('Invalid, expired, or already used authorization code');
    const consumed = await OAuthAuthorizationCode.updateOne(
      { _id: code._id, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
    ).exec();
    if (consumed.modifiedCount !== 1) throw new AuthenticationError('Authorization code was already used');
    return persistToken({
      application,
      userId: code.userId.toString(),
      scopes: code.scopes,
      grantType: 'authorization_code',
    });
  },

  async clientCredentials(input: {
    clientId: string;
    clientSecret: string;
    requestedScopes: string[];
  }) {
    const application = await authenticatedApplication(input.clientId, input.clientSecret);
    if (!application.grantTypes.includes('client_credentials')) {
      throw new AuthorizationError('Client credential grants are disabled for this application');
    }
    const scopes = assertGrantedScopes(input.requestedScopes, application.scopes);
    return persistToken({ application, scopes, grantType: 'client_credentials' });
  },

  async refresh(input: { clientId: string; clientSecret: string; refreshToken: string }) {
    const application = await authenticatedApplication(input.clientId, input.clientSecret);
    const parsed = parseOpaqueCredential(input.refreshToken, 'nxr');
    if (!parsed) throw new AuthenticationError('Invalid refresh token');
    const token = await OAuthToken.findOne({ refreshPrefix: parsed.prefix }).select('+refreshSecretHash').exec();
    if (
      !token || token.applicationId.toString() !== application._id.toString()
      || token.revokedAt || !token.refreshExpiresAt || token.refreshExpiresAt <= new Date()
      || !token.refreshSecretHash || !safeSecretEqual(token.refreshSecretHash, parsed.secret)
    ) throw new AuthenticationError('Invalid or expired refresh token');
    const revoked = await OAuthToken.updateOne(
      { _id: token._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revokeReason: 'refresh_token_rotated' } },
    ).exec();
    if (revoked.modifiedCount !== 1) throw new AuthenticationError('Refresh token reuse detected');
    return persistToken({
      application,
      userId: token.userId?.toString(),
      scopes: token.scopes,
      grantType: 'authorization_code',
    });
  },

  async revokeToken(input: { clientId: string; clientSecret: string; token: string }) {
    const application = await authenticatedApplication(input.clientId, input.clientSecret);
    const access = parseOpaqueCredential(input.token, 'nxo');
    const refresh = parseOpaqueCredential(input.token, 'nxr');
    if (!access && !refresh) return;
    await OAuthToken.updateOne({
      applicationId: application._id,
      ...(access ? { accessPrefix: access.prefix } : { refreshPrefix: refresh?.prefix }),
    }, { $set: { revokedAt: new Date(), revokeReason: 'oauth_revocation' } }).exec();
  },

  async authenticateAccessToken(rawToken: string, context: IdentityRequestContext) {
    const parsed = parseOpaqueCredential(rawToken, 'nxo');
    if (!parsed) throw new AuthenticationError('Invalid OAuth access token');
    const token = await OAuthToken.findOne({ accessPrefix: parsed.prefix }).select('+accessSecretHash').exec();
    if (
      !token || token.revokedAt || token.expiresAt <= new Date()
      || !safeSecretEqual(token.accessSecretHash, parsed.secret)
    ) throw new AuthenticationError('Invalid or expired OAuth access token');
    const application = await DeveloperApplication.findOne({ _id: token.applicationId, status: 'active' }).exec();
    if (!application) throw new AuthenticationError('OAuth application is unavailable');
    const workspace = await workspaceRepository.findById(token.workspaceId.toString());
    if (!workspace) throw new AuthenticationError('OAuth workspace is unavailable');

    let id = application._id.toString();
    let email = `oauth-${application._id.toString()}@nexpulse.internal`;
    let role = 'service_account';
    let permissions = token.scopes;
    let actorType: 'user' | 'service_account' = 'service_account';
    if (token.userId) {
      const user = await userRepository.findById(token.userId.toString());
      const membership = user ? await workspaceRepository.findMembership(workspace._id.toString(), user._id.toString()) : null;
      if (!user || user.status !== 'active' || !membership) throw new AuthenticationError('OAuth subject is unavailable');
      id = user._id.toString();
      email = user.email;
      role = membership.role;
      permissions = effectivePermissions(role, token.scopes);
      actorType = 'user';
    }
    void OAuthToken.updateOne(
      { _id: token._id },
      { $set: { lastUsedAt: new Date(), lastUsedIp: context.ipAddress } },
    ).exec();
    return {
      id,
      email,
      role,
      workspaceId: workspace._id.toString(),
      organizationId: workspace.organizationId?.toString(),
      permissions,
      actorType,
      oauthApplicationId: application._id.toString(),
      oauthTokenId: token._id.toString(),
    };
  },
};
