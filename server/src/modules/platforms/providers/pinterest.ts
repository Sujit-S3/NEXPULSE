import { config } from '../../../config/env.js';
import type { OAuthProviderAdapter, ProviderTokenSet } from '../types.js';
import {
  basicAuthorization,
  formBody,
  requestProviderJson,
} from '../oauth/http.js';

interface PinterestTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface PinterestUser {
  id?: string;
  username?: string;
  business_name?: string;
  account_type?: string;
  profile_image?: string;
  follower_count?: number;
}

interface PinterestAdAccount {
  id: string;
  name?: string;
  owner?: { username?: string };
}

interface PinterestAdAccountsResponse {
  items?: PinterestAdAccount[];
  bookmark?: string;
}

interface PinterestAnalyticsBucket {
  summary_metrics?: Record<string, number>;
  daily_metrics?: {
    date?: string;
    metrics?: Record<string, number>;
  }[];
}

interface PinterestAnalyticsResponse {
  all?: PinterestAnalyticsBucket;
  summary_metrics?: Record<string, number>;
  daily_metrics?: PinterestAnalyticsBucket['daily_metrics'];
}

interface PinterestAdAnalyticsRow {
  DATE?: string;
  IMPRESSION?: number;
  ENGAGEMENT?: number;
  TOTAL_AUDIENCE?: number;
}

const scopes = ['user_accounts:read', 'boards:read', 'pins:read', 'ads:read'];

async function getAdAccounts(accessToken: string): Promise<PinterestAdAccount[]> {
  const accounts: PinterestAdAccount[] = [];
  let bookmark: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const url = new URL('https://api.pinterest.com/v5/ad_accounts');
    url.searchParams.set('page_size', '100');
    if (bookmark) url.searchParams.set('bookmark', bookmark);
    const response = await requestProviderJson<PinterestAdAccountsResponse>(
      'Pinterest',
      url,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    accounts.push(...(response.items ?? []));
    bookmark = response.bookmark;
    if (!bookmark) break;
  }
  return accounts;
}

export const pinterestAdapter: OAuthProviderAdapter = {
  platform: 'pinterest',
  displayName: 'Pinterest',
  scopes,
  isConfigured() {
    return Boolean(config.oauth.pinterest.clientId && config.oauth.pinterest.clientSecret);
  },
  buildAuthorizationUrl({ state, redirectUri }) {
    const url = new URL('https://www.pinterest.com/oauth/');
    url.search = formBody({
      client_id: config.oauth.pinterest.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      state,
    }).toString();
    return url.toString();
  },
  async exchangeCode({ code, redirectUri }) {
    const token = await requestProviderJson<PinterestTokenResponse>(
      'Pinterest',
      'https://api.pinterest.com/v5/oauth/token',
      {
        method: 'POST',
        headers: {
          Authorization: basicAuthorization(
            config.oauth.pinterest.clientId ?? '',
            config.oauth.pinterest.clientSecret ?? '',
          ),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
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
    const authorization = { Authorization: `Bearer ${tokens.accessToken}` };
    const [user, adAccounts] = await Promise.all([
      requestProviderJson<PinterestUser>(
        'Pinterest',
        'https://api.pinterest.com/v5/user_account',
        { headers: authorization },
      ),
      getAdAccounts(tokens.accessToken),
    ]);
    const userId = user.id || user.username;
    if (!userId) return [];
    tokens.providerUserId = userId;
    return [
      {
        providerAccountId: userId,
        providerUserId: userId,
        displayName: user.business_name || user.username || userId,
        username: user.username,
        avatar: user.profile_image,
        followers: user.follower_count,
        accountType: user.account_type?.toLowerCase() || 'user',
      },
      ...adAccounts.map((account) => ({
        providerAccountId: account.id,
        providerUserId: userId,
        displayName: account.name || account.id,
        username: account.owner?.username,
        accountType: 'ad_account',
      })),
    ];
  },
  async refreshAccessToken(refreshToken) {
    const token = await requestProviderJson<PinterestTokenResponse>(
      'Pinterest',
      'https://api.pinterest.com/v5/oauth/token',
      {
        method: 'POST',
        headers: {
          Authorization: basicAuthorization(
            config.oauth.pinterest.clientId ?? '',
            config.oauth.pinterest.clientSecret ?? '',
          ),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody({ grant_type: 'refresh_token', refresh_token: refreshToken }),
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
    const authorization = { Authorization: `Bearer ${accessToken}` };
    const profilePromise = requestProviderJson<PinterestUser>(
      'Pinterest',
      'https://api.pinterest.com/v5/user_account',
      { headers: authorization },
    );
    const analyticsUrl = new URL(
      accountType === 'ad_account'
        ? `https://api.pinterest.com/v5/ad_accounts/${encodeURIComponent(providerAccountId)}/analytics`
        : 'https://api.pinterest.com/v5/user_account/analytics',
    );
    analyticsUrl.searchParams.set('start_date', from.toISOString().slice(0, 10));
    analyticsUrl.searchParams.set('end_date', to.toISOString().slice(0, 10));
    analyticsUrl.searchParams.set(
      accountType === 'ad_account' ? 'columns' : 'metric_types',
      'IMPRESSION,ENGAGEMENT,PIN_CLICK,OUTBOUND_CLICK,SAVE,TOTAL_AUDIENCE',
    );
    if (accountType === 'ad_account') {
      analyticsUrl.searchParams.set('granularity', 'DAY');
    } else {
      analyticsUrl.searchParams.set('split_field', 'NO_SPLIT');
      analyticsUrl.searchParams.set('app_types', 'ALL');
    }

    const [profile, analytics] = await Promise.all([
      profilePromise,
      requestProviderJson<PinterestAnalyticsResponse | PinterestAdAnalyticsRow[]>('Pinterest', analyticsUrl, {
        headers: authorization,
      }),
    ]);
    const adRows = Array.isArray(analytics) ? analytics : [];
    const bucket = Array.isArray(analytics) ? undefined : analytics.all ?? analytics;
    const summary = bucket?.summary_metrics ?? {};
    const daily = bucket?.daily_metrics ?? [];
    const history = adRows.length > 0
      ? adRows.filter((row) => Boolean(row.DATE)).map((row) => ({
          date: row.DATE as string,
          reach: row.TOTAL_AUDIENCE,
          impressions: row.IMPRESSION,
          engagement: row.ENGAGEMENT,
        }))
      : daily
          .filter((row) => Boolean(row.date))
          .map((row) => ({
            date: row.date as string,
            reach: row.metrics?.['TOTAL_AUDIENCE'],
            impressions: row.metrics?.['IMPRESSION'],
            engagement: row.metrics?.['ENGAGEMENT'],
          }));
    const total = (key: keyof PinterestAdAnalyticsRow): number | undefined => {
      if (adRows.length === 0) return undefined;
      return adRows.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0), 0);
    };
    return {
      metrics: {
        followers: accountType === 'ad_account' ? undefined : profile.follower_count,
        reach: summary['TOTAL_AUDIENCE'] ?? total('TOTAL_AUDIENCE'),
        impressions: summary['IMPRESSION'] ?? total('IMPRESSION'),
        engagement: summary['ENGAGEMENT'] ?? total('ENGAGEMENT'),
      },
      history,
      posts: [],
      unavailable: [
        ...(accountType === 'ad_account' ? ['followers'] : []),
        'following',
        'posts',
        'views',
        'audience',
      ],
    };
  },
};
