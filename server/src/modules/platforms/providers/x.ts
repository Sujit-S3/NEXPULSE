import { config } from '../../../config/env.js';
import type { OAuthProviderAdapter, ProviderTokenSet } from '../types.js';
import {
  basicAuthorization,
  formBody,
  requestProviderJson,
} from '../oauth/http.js';

interface XTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface XUserResponse {
  data?: {
    id: string;
    name: string;
    username?: string;
    profile_image_url?: string;
    verified_type?: string;
    public_metrics?: {
      followers_count?: number;
      following_count?: number;
      tweet_count?: number;
    };
  };
}

interface XTimelineResponse {
  data?: {
    id: string;
    text?: string;
    created_at?: string;
    public_metrics?: {
      retweet_count?: number;
      reply_count?: number;
      like_count?: number;
      quote_count?: number;
      bookmark_count?: number;
      impression_count?: number;
    };
  }[];
  meta?: { next_token?: string };
}

const scopes = ['tweet.read', 'users.read', 'offline.access'];

function tokenHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (config.oauth.x.clientSecret) {
    headers['Authorization'] = basicAuthorization(
      config.oauth.x.clientId ?? '',
      config.oauth.x.clientSecret,
    );
  }
  return headers;
}

export const xAdapter: OAuthProviderAdapter = {
  platform: 'x',
  displayName: 'X',
  scopes,
  isConfigured() {
    return Boolean(config.oauth.x.clientId && config.oauth.x.clientSecret);
  },
  buildAuthorizationUrl({ state, redirectUri, codeChallenge }) {
    const url = new URL('https://x.com/i/oauth2/authorize');
    url.search = formBody({
      response_type: 'code',
      client_id: config.oauth.x.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  },
  async exchangeCode({ code, redirectUri, codeVerifier }) {
    const token = await requestProviderJson<XTokenResponse>(
      'X',
      'https://api.x.com/2/oauth2/token',
      {
        method: 'POST',
        headers: tokenHeaders(),
        body: formBody({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
          client_id: config.oauth.x.clientId,
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
    const response = await requestProviderJson<XUserResponse>(
      'X',
      'https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,public_metrics,verified_type',
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    const user = response.data;
    if (!user) return [];
    tokens.providerUserId = user.id;
    return [
      {
        providerAccountId: user.id,
        providerUserId: user.id,
        displayName: user.name,
        username: user.username,
        avatar: user.profile_image_url,
        followers: user.public_metrics?.followers_count,
        accountType:
          user.verified_type && user.verified_type !== 'none'
            ? `verified:${user.verified_type}`
            : 'user',
      },
    ];
  },
  async refreshAccessToken(refreshToken) {
    const token = await requestProviderJson<XTokenResponse>(
      'X',
      'https://api.x.com/2/oauth2/token',
      {
        method: 'POST',
        headers: tokenHeaders(),
        body: formBody({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.oauth.x.clientId,
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
  async revokeAccess(accessToken) {
    await requestProviderJson<unknown>('X', 'https://api.x.com/2/oauth2/revoke', {
      method: 'POST',
      headers: tokenHeaders(),
      body: formBody({ token: accessToken, token_type_hint: 'access_token' }),
    });
  },
  async fetchAnalytics({ accessToken, providerAccountId, from, to, cursor, limit }) {
    const authorization = { Authorization: `Bearer ${accessToken}` };
    const profileUrl = new URL(`https://api.x.com/2/users/${encodeURIComponent(providerAccountId)}`);
    profileUrl.searchParams.set('user.fields', 'public_metrics');
    const timelineUrl = new URL(
      `https://api.x.com/2/users/${encodeURIComponent(providerAccountId)}/tweets`,
    );
    timelineUrl.searchParams.set(
      'tweet.fields',
      'created_at,public_metrics',
    );
    timelineUrl.searchParams.set('start_time', from.toISOString());
    timelineUrl.searchParams.set('end_time', to.toISOString());
    timelineUrl.searchParams.set('max_results', String(Math.min(Math.max(limit, 5), 100)));
    if (cursor) timelineUrl.searchParams.set('pagination_token', cursor);

    const [profile, timeline] = await Promise.all([
      requestProviderJson<XUserResponse>('X', profileUrl, { headers: authorization }),
      requestProviderJson<XTimelineResponse>('X', timelineUrl, { headers: authorization }),
    ]);
    const posts = (timeline.data ?? []).map((post) => {
      const metrics = post.public_metrics;
      const engagement =
        (metrics?.retweet_count ?? 0) +
        (metrics?.reply_count ?? 0) +
        (metrics?.like_count ?? 0) +
        (metrics?.quote_count ?? 0) +
        (metrics?.bookmark_count ?? 0);
      return {
        id: post.id,
        content: post.text,
        publishedAt: post.created_at,
        url: `https://x.com/i/web/status/${post.id}`,
        metrics: {
          impressions: metrics?.impression_count,
          likes: metrics?.like_count,
          comments: metrics?.reply_count,
          shares: (metrics?.retweet_count ?? 0) + (metrics?.quote_count ?? 0),
          saves: metrics?.bookmark_count,
          engagement,
        },
      };
    });
    return {
      metrics: {
        followers: profile.data?.public_metrics?.followers_count,
        following: profile.data?.public_metrics?.following_count,
        posts: profile.data?.public_metrics?.tweet_count,
        impressions: posts.reduce(
          (sum, post) => sum + (post.metrics.impressions ?? 0),
          0,
        ),
        engagement: posts.reduce(
          (sum, post) => sum + (post.metrics.engagement ?? 0),
          0,
        ),
      },
      history: [],
      posts,
      unavailable: ['reach', 'views', 'audience', 'history'],
      nextCursor: timeline.meta?.next_token,
    };
  },
};
