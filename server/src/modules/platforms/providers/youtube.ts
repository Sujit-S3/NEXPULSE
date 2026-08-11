import { config } from '../../../config/env.js';
import type { OAuthProviderAdapter, ProviderTokenSet } from '../types.js';
import {
  formBody,
  requestProviderJson,
} from '../oauth/http.js';

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface GoogleUserInfo {
  sub: string;
}

interface YouTubeChannel {
  id: string;
  snippet?: {
    title?: string;
    customUrl?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
  };
  contentDetails?: {
    relatedPlaylists?: { uploads?: string };
  };
}

interface YouTubeChannelsResponse {
  items?: YouTubeChannel[];
}

interface YouTubePlaylistItemsResponse {
  items?: {
    snippet?: {
      resourceId?: { videoId?: string };
      title?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }[];
  nextPageToken?: string;
}

interface YouTubeVideosResponse {
  items?: {
    id: string;
    snippet?: { title?: string; publishedAt?: string };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }[];
}

const scopes = [
  'openid',
  'profile',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export const youtubeAdapter: OAuthProviderAdapter = {
  platform: 'youtube',
  displayName: 'YouTube',
  scopes,
  isConfigured() {
    return Boolean(config.oauth.google.clientId && config.oauth.google.clientSecret);
  },
  buildAuthorizationUrl({ state, redirectUri, forceConsent }) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = formBody({
      response_type: 'code',
      client_id: config.oauth.google.clientId,
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: forceConsent ? 'consent' : 'select_account',
    }).toString();
    return url.toString();
  },
  async exchangeCode({ code, redirectUri }) {
    const token = await requestProviderJson<GoogleTokenResponse>(
      'Google',
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: config.oauth.google.clientId,
          client_secret: config.oauth.google.clientSecret,
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
    const [user, channels] = await Promise.all([
      requestProviderJson<GoogleUserInfo>(
        'Google',
        'https://openidconnect.googleapis.com/v1/userinfo',
        { headers: authorization },
      ),
      requestProviderJson<YouTubeChannelsResponse>(
        'YouTube',
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&maxResults=50',
        { headers: authorization },
      ),
    ]);
    tokens.providerUserId = user.sub;
    return (channels.items ?? []).map((channel) => {
      const thumbnail =
        channel.snippet?.thumbnails?.['high']?.url ??
        channel.snippet?.thumbnails?.['medium']?.url ??
        channel.snippet?.thumbnails?.['default']?.url;
      const subscriberCount = channel.statistics?.subscriberCount;
      return {
        providerAccountId: channel.id,
        providerUserId: user.sub,
        displayName: channel.snippet?.title || channel.id,
        username: channel.snippet?.customUrl,
        avatar: thumbnail,
        followers: subscriberCount ? Number(subscriberCount) : undefined,
        accountType: 'channel',
      };
    });
  },
  async refreshAccessToken(refreshToken) {
    const token = await requestProviderJson<GoogleTokenResponse>(
      'Google',
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.oauth.google.clientId,
          client_secret: config.oauth.google.clientSecret,
        }),
      },
    );
    return {
      accessToken: token.access_token,
      refreshToken,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : undefined,
      scopes: token.scope?.split(/[,\s]+/).filter(Boolean) ?? scopes,
    };
  },
  async revokeAccess(accessToken) {
    await requestProviderJson<unknown>(
      'Google',
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
  },
  async fetchAnalytics({ accessToken, providerAccountId, from, to, cursor, limit }) {
    const authorization = { Authorization: `Bearer ${accessToken}` };
    const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
    channelUrl.searchParams.set('id', providerAccountId);
    const channelResponse = await requestProviderJson<YouTubeChannelsResponse>(
      'YouTube',
      channelUrl,
      { headers: authorization },
    );
    const channel = channelResponse.items?.[0];
    const uploads = channel?.contentDetails?.relatedPlaylists?.uploads;
    if (!channel || !uploads) {
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

    const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    playlistUrl.searchParams.set('part', 'snippet');
    playlistUrl.searchParams.set('playlistId', uploads);
    playlistUrl.searchParams.set('maxResults', String(Math.min(Math.max(limit, 1), 50)));
    if (cursor) playlistUrl.searchParams.set('pageToken', cursor);
    const playlist = await requestProviderJson<YouTubePlaylistItemsResponse>(
      'YouTube',
      playlistUrl,
      { headers: authorization },
    );
    const ids = (playlist.items ?? [])
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter((id): id is string => Boolean(id));
    let videos: YouTubeVideosResponse = { items: [] };
    if (ids.length > 0) {
      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      videosUrl.searchParams.set('part', 'snippet,statistics');
      videosUrl.searchParams.set('id', ids.join(','));
      videos = await requestProviderJson<YouTubeVideosResponse>('YouTube', videosUrl, {
        headers: authorization,
      });
    }
    const thumbnailsById = new Map(
      (playlist.items ?? []).map((item) => [
        item.snippet?.resourceId?.videoId,
        item.snippet?.thumbnails?.['high']?.url ??
          item.snippet?.thumbnails?.['medium']?.url ??
          item.snippet?.thumbnails?.['default']?.url,
      ]),
    );
    const posts = (videos.items ?? []).filter((video) => {
      if (!video.snippet?.publishedAt) return true;
      const publishedAt = new Date(video.snippet.publishedAt).getTime();
      return publishedAt >= from.getTime() && publishedAt <= to.getTime();
    }).map((video) => {
      const likes = Number(video.statistics?.likeCount ?? 0);
      const comments = Number(video.statistics?.commentCount ?? 0);
      return {
        id: video.id,
        content: video.snippet?.title,
        publishedAt: video.snippet?.publishedAt,
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
        thumbnail: thumbnailsById.get(video.id),
        metrics: {
          views: video.statistics?.viewCount
            ? Number(video.statistics.viewCount)
            : undefined,
          likes: video.statistics?.likeCount
            ? Number(video.statistics.likeCount)
            : undefined,
          comments: video.statistics?.commentCount
            ? Number(video.statistics.commentCount)
            : undefined,
          engagement: likes + comments,
        },
      };
    });
    return {
      metrics: {
        followers: channel.statistics?.subscriberCount
          ? Number(channel.statistics.subscriberCount)
          : undefined,
        posts: posts.length,
        views: posts.reduce((sum, post) => sum + (post.metrics.views ?? 0), 0),
        engagement: posts.reduce(
          (sum, post) => sum + (post.metrics.engagement ?? 0),
          0,
        ),
      },
      history: [],
      posts,
      unavailable: ['following', 'reach', 'impressions', 'audience', 'history'],
      nextCursor: playlist.nextPageToken,
    };
  },
};
