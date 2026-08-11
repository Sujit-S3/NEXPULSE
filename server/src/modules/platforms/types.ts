export const PLATFORMS = [
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
  'x',
  'pinterest',
] as const;

export type PlatformType = (typeof PLATFORMS)[number];
export type ConnectionStatus =
  | 'connected'
  | 'expired'
  | 'revoked'
  | 'permissions_required'
  | 'error';

export interface NormalizedMetricPoint {
  date: string;
  followers?: number;
  following?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  views?: number;
  posts?: number;
}

export interface NormalizedPost {
  id: string;
  content?: string;
  publishedAt?: string;
  url?: string;
  thumbnail?: string;
  metrics: {
    reach?: number;
    impressions?: number;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    engagement?: number;
  };
}

export interface NormalizedAudience {
  countries?: { name: string; value: number }[];
  cities?: { name: string; value: number }[];
  age?: { name: string; value: number }[];
  gender?: { name: string; value: number }[];
  languages?: { name: string; value: number }[];
}

export interface ProviderAnalyticsInput {
  accessToken: string;
  providerAccountId: string;
  providerUserId: string;
  accountType: string;
  from: Date;
  to: Date;
  cursor?: string;
  limit: number;
}

export interface ProviderAnalyticsResult {
  metrics: {
    followers?: number;
    following?: number;
    reach?: number;
    impressions?: number;
    posts?: number;
    engagement?: number;
    views?: number;
  };
  history: NormalizedMetricPoint[];
  posts: NormalizedPost[];
  audience?: NormalizedAudience;
  unavailable: string[];
  nextCursor?: string;
}

export interface ProviderTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  providerUserId?: string;
  scopes: string[];
}

export interface DiscoveredAccount {
  providerAccountId: string;
  providerUserId: string;
  displayName: string;
  username?: string;
  avatar?: string;
  followers?: number;
  accountType: string;
  accessToken?: string;
}

export interface PublicDiscoveredAccount {
  providerAccountId: string;
  providerUserId: string;
  displayName: string;
  username?: string;
  avatar?: string;
  followers?: number;
  accountType: string;
  connected: boolean;
}

export interface OAuthAuthorizationInput {
  state: string;
  redirectUri: string;
  codeChallenge?: string;
  forceConsent?: boolean;
}

export interface OAuthCodeExchangeInput {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

export interface OAuthProviderAdapter {
  platform: PlatformType;
  displayName: string;
  scopes: string[];
  isConfigured(): boolean;
  buildAuthorizationUrl(input: OAuthAuthorizationInput): string;
  exchangeCode(input: OAuthCodeExchangeInput): Promise<ProviderTokenSet>;
  discoverAccounts(tokens: ProviderTokenSet): Promise<DiscoveredAccount[]>;
  refreshAccessToken?(refreshToken: string): Promise<ProviderTokenSet>;
  revokeAccess?(accessToken: string): Promise<void>;
  fetchAnalytics?(input: ProviderAnalyticsInput): Promise<ProviderAnalyticsResult>;
}

export interface PublicOAuthProvider {
  id: PlatformType;
  name: string;
  scopes: string[];
}

export interface PublicOAuthProviderStatus extends PublicOAuthProvider {
  configured: boolean;
}

export interface PublicPlatformConnection {
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
  status: ConnectionStatus;
  scopes: string[];
  tokenExpiresAt?: string;
  connectedAt: string;
  updatedAt: string;
}

export interface NormalizedAnalytics {
  connectionId: string;
  workspaceId: string;
  provider: PlatformType;
  providerAccountId: string;
  displayName: string;
  collectedAt: string;
  range: { from: string; to: string };
  metrics: {
    followers: number | null;
    following: number | null;
    reach: number | null;
    impressions: number | null;
    posts: number | null;
    engagement: number | null;
    engagementRate: number | null;
    views: number | null;
  };
  history: NormalizedMetricPoint[];
  posts: NormalizedPost[];
  audience: NormalizedAudience | null;
  unavailable: string[];
  nextCursor?: string;
}

export interface OAuthSelection {
  accountIds: string[];
  primaryAccountId: string;
}
