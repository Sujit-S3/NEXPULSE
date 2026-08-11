import 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        email: string;
        role: string;
        workspaceId: string;
        organizationId?: string;
        permissions: import('../modules/identity/permissions.js').Permission[];
        actorType: 'user' | 'service_account';
        sessionId?: string;
        credentialId?: string;
        oauthApplicationId?: string;
        oauthTokenId?: string;
        riskScore?: number;
        mfaVerified?: boolean;
      };
      apiGateway?: {
        startedAt: bigint;
        endpoint: string;
        version: string;
      };
      rawBody?: Buffer;
    }
  }
}
