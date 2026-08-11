import { config } from '../../../config/env.js';
import type { OAuthProviderAdapter, ProviderTokenSet } from '../types.js';
import { formBody, requestProviderJson } from '../oauth/http.js';

interface TikTokTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  scope?: string;
}

interface TikTokUserResponse {
  data?: {
    user?: {
      open_id?: string;
      union_id?: string;
      display_name?: string;
      username?: string;
      avatar_url?: string;
      follower_count?: number;
      following_count?: number;
      likes_count?: number;
      video_count?: number;
    };
  };
  error?: { code?: string; message?: string };
}

interface TikTokVideoResponse {
  data?: {
    videos?: {
      id: string;
      title?: string;
      video_description?: string;
      create_time?: number;
      share_url?: string;
      cover_image_url?: string;
      view_count?: number;
      like_count?: number;
      comment_count?: number;
      share_count?: number;
    }[];
    cursor?: number;
    has_more?: boolean;
  };
}

const scopes = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list',
];

export const tiktokAdapter: OAuthProviderAdapter = {
  platform: 'tiktok',
  displayName: 'TikTok',
  scopes,
  isConfigured() {
    return Boolean(config.oauth.tiktok.clientKey && config.oauth.tiktok.clientSecret);
  },
  buildAuthorizationUrl({ state, redirectUri }) {
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.search = formBody({
      client_key: config.oauth.tiktok.clientKey,
      response_type: 'code',
      scope: scopes.join(','),
      redirect_uri: redirectUri,
      state,
    }).toString();
    return url.toString();
  },
  async exchangeCode({ code, redirectUri }) {
    const token = await requestProviderJson<TikTokTokenResponse>(
      'TikTok',
      'https://open.tiktokapis.com/v2/oauth/token/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          client_key: config.oauth.tiktok.clientKey,
          client_secret: config.oauth.tiktok.clientSecret,
          code,
          grant_type: 'authorization_code',
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
      providerUserId: token.open_id,
      scopes: token.scope?.split(/[,\s]+/).filter(Boolean) ?? scopes,
    };
  },
  async discoverAccounts(tokens: ProviderTokenSet) {
    const response = await requestProviderJson<TikTokUserResponse>(
      'TikTok',
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,username,avatar_url,follower_count,following_count,likes_count,video_count',
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    const user = response.data?.user;
    const providerAccountId = user?.open_id ?? tokens.providerUserId;
    if (!user || !providerAccountId) return [];
    const providerUserId = user.union_id ?? providerAccountId;
    tokens.providerUserId = providerUserId;
    return [
      {
        providerAccountId,
        providerUserId,
        displayName: user.display_name || user.username || providerAccountId,
        username: user.username,
        avatar: user.avatar_url,
        followers: user.follower_count,
        accountType: 'creator',
      },
    ];
  },
  async refreshAccessToken(refreshToken) {
    const token = await requestProviderJson<TikTokTokenResponse>(
      'TikTok',
      'https://open.tiktokapis.com/v2/oauth/token/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          client_key: config.oauth.tiktok.clientKey,
          client_secret: config.oauth.tiktok.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      },
    );
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? refreshToken,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : undefined,
      providerUserId: token.open_id,
      scopes: token.scope?.split(/[,\s]+/).filter(Boolean) ?? scopes,
    };
  },
  async revokeAccess(accessToken) {
    await requestProviderJson<unknown>(
      'TikTok',
      'https://open.tiktokapis.com/v2/oauth/revoke/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          client_key: config.oauth.tiktok.clientKey,
          client_secret: config.oauth.tiktok.clientSecret,
          token: accessToken,
        }),
      },
    );
  },
  async fetchAnalytics({ accessToken, from, to, cursor, limit }) {
    const userFields =
      'open_id,union_id,display_name,username,avatar_url,follower_count,following_count,likes_count,video_count';
    const videoFields =
      'id,title,video_description,create_time,share_url,cover_image_url,view_count,like_count,comment_count,share_count';
    const [profile, videosResponse] = await Promise.all([
      requestProviderJson<TikTokUserResponse>(
        'TikTok',
        `https://open.tiktokapis.com/v2/user/info/?fields=${userFields}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
      requestProviderJson<TikTokVideoResponse>(
        'TikTok',
        `https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            max_count: Math.min(Math.max(limit, 1), 20),
            cursor: cursor ? Number(cursor) : undefined,
          }),
        },
      ),
    ]);
    const user = profile.data?.user;
    const videos = (videosResponse.data?.videos ?? []).filter((video) => {
      if (!video.create_time) return true;
      const createdAt = video.create_time * 1000;
      return createdAt >= from.getTime() && createdAt <= to.getTime();
    });
    const posts = videos.map((video) => {
      const likes = video.like_count ?? 0;
      const comments = video.comment_count ?? 0;
      const shares = video.share_count ?? 0;
      return {
        id: video.id,
        content: video.video_description || video.title,
        publishedAt: video.create_time
          ? new Date(video.create_time * 1000).toISOString()
          : undefined,
        url: video.share_url,
        thumbnail: video.cover_image_url,
        metrics: {
          views: video.view_count,
          likes: video.like_count,
          comments: video.comment_count,
          shares: video.share_count,
          engagement: likes + comments + shares,
        },
      };
    });
    return {
      metrics: {
        followers: user?.follower_count,
        following: user?.following_count,
        posts: posts.length,
        engagement: posts.reduce((sum, post) => sum + (post.metrics.engagement ?? 0), 0),
        views: posts.reduce((sum, post) => sum + (post.metrics.views ?? 0), 0),
      },
      history: [],
      posts,
      unavailable: ['reach', 'impressions', 'audience', 'history'],
      nextCursor: videosResponse.data?.has_more && videosResponse.data.cursor !== undefined
        ? String(videosResponse.data.cursor)
        : undefined,
    };
  },
};
