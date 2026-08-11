export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  workspaceId: string;
  organizationId?: string;
  permissions: string[];
  mfa: {
    enabled: boolean;
    emailOtpEnabled: boolean;
    enrollmentRequired: boolean;
  };
  preferences: {
    theme?: string;
    notifications?: boolean;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export type MfaMethod = "totp" | "email" | "recovery";

export interface MfaChallenge {
  mfaRequired: true;
  challengeToken: string;
  methods: MfaMethod[];
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  invitationToken?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    timezone?: string;
  };
}

export type PlatformType = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x' | 'pinterest';

export interface PlatformConnection {
  id: string;
  workspaceId: string;
  provider: PlatformType;
  providerAccountId: string;
  providerUserId: string;
  displayName: string;
  username?: string;
  avatar?: string;
  followers?: number;
  accountType: string;
  selectedAccount: true;
  isPrimary: boolean;
  status: 'connected' | 'expired' | 'revoked' | 'permissions_required' | 'error';
  scopes: string[];
  tokenExpiresAt?: string;
  connectedAt: string;
  updatedAt: string;
}

export interface ProviderHealthPoint {
  date: string;
  availability: number | null;
  latencyMs: number | null;
  requests: number;
}

export interface ProviderHealth {
  connectionId: string;
  provider: PlatformType;
  displayName: string;
  status: PlatformConnection["status"];
  lastHealthCheckAt?: string;
  lastSyncAt?: string;
  tokenExpiresAt?: string;
  requests: number;
  availability: number | null;
  errorRate: number | null;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
  tokenRefreshes: number;
  costUsd: number | null;
  history: ProviderHealthPoint[];
}

export interface OAuthProvider {
  id: PlatformType;
  name: string;
  scopes: string[];
}

export interface OAuthProviderStatus extends OAuthProvider {
  configured: boolean;
}

export interface OAuthDiscoveredAccount {
  providerAccountId: string;
  providerUserId: string;
  displayName: string;
  username?: string;
  avatar?: string;
  followers?: number;
  accountType: string;
  connected: boolean;
}

export interface OAuthAccountSelectionSession {
  provider: PlatformType;
  providerName: string;
  accounts: OAuthDiscoveredAccount[];
  scopes: string[];
}
