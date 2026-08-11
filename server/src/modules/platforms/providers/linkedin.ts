import { config } from '../../../config/env.js';
import type {
  DiscoveredAccount,
  OAuthProviderAdapter,
  ProviderTokenSet,
} from '../types.js';
import { formBody, requestProviderJson } from '../oauth/http.js';

interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

interface LinkedInAcl {
  organization?: string;
  organizationalTarget?: string;
}

interface LinkedInAclResponse {
  elements?: LinkedInAcl[];
}

interface LinkedInOrganization {
  id?: number | string;
  localizedName?: string;
  vanityName?: string;
}

interface LinkedInNetworkSize {
  firstDegreeSize?: number;
}

interface LinkedInShareStatisticsResponse {
  elements?: {
    timeRange?: { start?: number; end?: number };
    totalShareStatistics?: {
      impressionCount?: number;
      uniqueImpressionsCount?: number;
      clickCount?: number;
      likeCount?: number;
      commentCount?: number;
      shareCount?: number;
      engagement?: number;
    };
  }[];
}

const scopes = config.oauth.linkedin.scopes;

function headers(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': config.oauth.linkedin.apiVersion,
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

function organizationId(value: string): string | null {
  const match = value.match(/urn:li:organization:(\d+)$/);
  return match?.[1] ?? null;
}

async function discoverOrganizations(accessToken: string): Promise<DiscoveredAccount[]> {
  if (!scopes.some((scope) => scope.includes('organization'))) return [];

  const acls = await requestProviderJson<LinkedInAclResponse>(
    'LinkedIn',
    'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED',
    { headers: headers(accessToken) },
  );

  const ids = Array.from(
    new Set(
      (acls.elements ?? [])
        .map((acl) => acl.organization ?? acl.organizationalTarget)
        .filter((value): value is string => Boolean(value))
        .map(organizationId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return Promise.all(
    ids.map(async (id): Promise<DiscoveredAccount> => {
      const organization = await requestProviderJson<LinkedInOrganization>(
        'LinkedIn',
        `https://api.linkedin.com/rest/organizations/${encodeURIComponent(id)}`,
        { headers: headers(accessToken) },
      );
      return {
        providerAccountId: String(organization.id ?? id),
        providerUserId: '',
        displayName: organization.localizedName || organization.vanityName || id,
        username: organization.vanityName,
        accountType: 'organization',
      };
    }),
  );
}

export const linkedinAdapter: OAuthProviderAdapter = {
  platform: 'linkedin',
  displayName: 'LinkedIn',
  scopes,
  isConfigured() {
    return Boolean(config.oauth.linkedin.clientId && config.oauth.linkedin.clientSecret);
  },
  buildAuthorizationUrl({ state, redirectUri }) {
    const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
    url.search = formBody({
      response_type: 'code',
      client_id: config.oauth.linkedin.clientId,
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
    }).toString();
    return url.toString();
  },
  async exchangeCode({ code, redirectUri }) {
    const token = await requestProviderJson<LinkedInTokenResponse>(
      'LinkedIn',
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: config.oauth.linkedin.clientId,
          client_secret: config.oauth.linkedin.clientSecret,
        }),
      },
    );
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : undefined,
      scopes: token.scope?.split(/[,\s]+/).filter(Boolean) ?? scopes,
    };
  },
  async discoverAccounts(tokens: ProviderTokenSet) {
    const member = await requestProviderJson<LinkedInUserInfo>(
      'LinkedIn',
      'https://api.linkedin.com/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    tokens.providerUserId = member.sub;

    const organizations = await discoverOrganizations(tokens.accessToken);
    for (const organization of organizations) {
      organization.providerUserId = member.sub;
    }

    const memberName =
      member.name ||
      [member.given_name, member.family_name].filter(Boolean).join(' ') ||
      member.sub;
    return [
      {
        providerAccountId: member.sub,
        providerUserId: member.sub,
        displayName: memberName,
        avatar: member.picture,
        accountType: 'member',
      },
      ...organizations,
    ];
  },
  async refreshAccessToken(refreshToken) {
    const token = await requestProviderJson<LinkedInTokenResponse>(
      'LinkedIn',
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.oauth.linkedin.clientId,
          client_secret: config.oauth.linkedin.clientSecret,
        }),
      },
    );
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? refreshToken,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : undefined,
      scopes: token.scope?.split(/[,\s]+/).filter(Boolean) ?? scopes,
    };
  },
  async fetchAnalytics({ accessToken, providerAccountId, accountType, from, to }) {
    if (accountType !== 'organization') {
      return {
        metrics: {},
        history: [],
        posts: [],
        unavailable: [
          'followers',
          'following',
          'reach',
          'impressions',
          'posts',
          'engagement',
          'views',
          'audience',
          'history',
        ],
      };
    }
    const requestHeaders = headers(accessToken);
    const organizationUrn = `urn:li:organization:${providerAccountId}`;
    const networkUrl =
      `https://api.linkedin.com/rest/networkSizes/${encodeURIComponent(organizationUrn)}` +
      '?edgeType=CompanyFollowedByMember';
    const statsUrl = new URL(
      'https://api.linkedin.com/rest/organizationalEntityShareStatistics',
    );
    statsUrl.searchParams.set('q', 'organizationalEntity');
    statsUrl.searchParams.set('organizationalEntity', organizationUrn);
    statsUrl.searchParams.set(
      'timeIntervals',
      `(timeRange:(start:${from.getTime()},end:${to.getTime()}),timeGranularityType:DAY)`,
    );
    const [network, response] = await Promise.all([
      requestProviderJson<LinkedInNetworkSize>('LinkedIn', networkUrl, {
        headers: requestHeaders,
      }),
      requestProviderJson<LinkedInShareStatisticsResponse>('LinkedIn', statsUrl, {
        headers: requestHeaders,
      }),
    ]);
    const history = (response.elements ?? []).map((element) => {
      const stats = element.totalShareStatistics;
      return {
        date: new Date(element.timeRange?.start ?? from.getTime()).toISOString(),
        impressions: stats?.impressionCount,
        reach: stats?.uniqueImpressionsCount,
        engagement:
          (stats?.likeCount ?? 0) +
          (stats?.commentCount ?? 0) +
          (stats?.shareCount ?? 0) +
          (stats?.clickCount ?? 0),
      };
    });
    return {
      metrics: {
        followers: network.firstDegreeSize,
        reach: history.reduce((sum, point) => sum + (point.reach ?? 0), 0),
        impressions: history.reduce(
          (sum, point) => sum + (point.impressions ?? 0),
          0,
        ),
        engagement: history.reduce(
          (sum, point) => sum + (point.engagement ?? 0),
          0,
        ),
      },
      history,
      posts: [],
      unavailable: ['following', 'posts', 'views', 'audience'],
    };
  },
};
