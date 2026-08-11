import { config } from '../../../config/env.js';
import type {
  DiscoveredAccount,
  OAuthProviderAdapter,
  PlatformType,
  ProviderTokenSet,
} from '../types.js';
import { formBody, requestProviderJson } from '../oauth/http.js';

interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface MetaUserResponse {
  id: string;
  name?: string;
}

interface MetaPage {
  id: string;
  name: string;
  username?: string;
  category?: string;
  access_token?: string;
  followers_count?: number;
  fan_count?: number;
  picture?: { data?: { url?: string } };
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    account_type?: string;
  };
}

interface MetaPagesResponse {
  data: MetaPage[];
  paging?: { next?: string };
}

interface MetaPermissionsResponse {
  data?: { permission?: string; status?: string }[];
}

interface InstagramProfileResponse {
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

interface InstagramMediaResponse {
  data?: {
    id: string;
    caption?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
  }[];
  paging?: { cursors?: { after?: string } };
}

interface FacebookPageResponse {
  followers_count?: number;
  fan_count?: number;
}

interface FacebookPostsResponse {
  data?: {
    id: string;
    message?: string;
    created_time?: string;
    permalink_url?: string;
    full_picture?: string;
    shares?: { count?: number };
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
  }[];
  paging?: { cursors?: { after?: string } };
}

const graphBase = () => `https://graph.facebook.com/${config.oauth.meta.graphVersion}`;

function configured(): boolean {
  return Boolean(config.oauth.meta.clientId && config.oauth.meta.clientSecret);
}

async function exchangeMetaCode(code: string, redirectUri: string): Promise<ProviderTokenSet> {
  const tokenUrl = new URL(`${graphBase()}/oauth/access_token`);
  tokenUrl.search = formBody({
    client_id: config.oauth.meta.clientId,
    client_secret: config.oauth.meta.clientSecret,
    redirect_uri: redirectUri,
    code,
  }).toString();
  const shortLived = await requestProviderJson<MetaTokenResponse>('Meta', tokenUrl);

  const longLivedUrl = new URL(`${graphBase()}/oauth/access_token`);
  longLivedUrl.search = formBody({
    grant_type: 'fb_exchange_token',
    client_id: config.oauth.meta.clientId,
    client_secret: config.oauth.meta.clientSecret,
    fb_exchange_token: shortLived.access_token,
  }).toString();
  const token = await requestProviderJson<MetaTokenResponse>('Meta', longLivedUrl);

  return {
    accessToken: token.access_token,
    expiresAt: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : undefined,
    scopes: [],
  };
}

async function getMetaUser(tokens: ProviderTokenSet): Promise<MetaUserResponse> {
  const url = new URL(`${graphBase()}/me`);
  url.search = formBody({ fields: 'id,name', access_token: tokens.accessToken }).toString();
  return requestProviderJson<MetaUserResponse>('Meta', url);
}

async function getAllPages(tokens: ProviderTokenSet): Promise<MetaPage[]> {
  const first = new URL(`${graphBase()}/me/accounts`);
  first.search = formBody({
    fields:
      'id,name,username,category,access_token,followers_count,fan_count,picture{url},instagram_business_account{id,username,name,profile_picture_url,followers_count,account_type}',
    limit: '100',
    access_token: tokens.accessToken,
  }).toString();

  const pages: MetaPage[] = [];
  let next: string | undefined = first.toString();
  for (let page = 0; next && page < 10; page += 1) {
    const response: MetaPagesResponse = await requestProviderJson<MetaPagesResponse>(
      'Meta',
      next,
    );
    pages.push(...response.data);
    next = response.paging?.next;
  }
  return pages;
}

async function discoverMetaAccounts(
  platform: PlatformType,
  tokens: ProviderTokenSet,
): Promise<DiscoveredAccount[]> {
  const permissionsUrl = new URL(`${graphBase()}/me/permissions`);
  permissionsUrl.searchParams.set('access_token', tokens.accessToken);
  const [user, pages, permissions] = await Promise.all([
    getMetaUser(tokens),
    getAllPages(tokens),
    requestProviderJson<MetaPermissionsResponse>('Meta', permissionsUrl),
  ]);
  tokens.providerUserId = user.id;
  tokens.scopes = (permissions.data ?? [])
    .filter((permission) => permission.status === 'granted' && permission.permission)
    .map((permission) => permission.permission as string);

  if (platform === 'facebook') {
    return pages.map((page) => ({
      providerAccountId: page.id,
      providerUserId: user.id,
      displayName: page.name,
      username: page.username,
      avatar: page.picture?.data?.url,
      followers: page.followers_count ?? page.fan_count,
      accountType: page.category ? `page:${page.category}` : 'page',
      accessToken: page.access_token,
    }));
  }

  return pages.flatMap((page): DiscoveredAccount[] => {
    const account = page.instagram_business_account;
    if (!account) return [];
    return [
      {
        providerAccountId: account.id,
        providerUserId: user.id,
        displayName: account.name || account.username || account.id,
        username: account.username,
        avatar: account.profile_picture_url,
        followers: account.followers_count,
        accountType: account.account_type?.toLowerCase() || 'professional',
        accessToken: page.access_token,
      },
    ];
  });
}

function metaAdapter(
  platform: 'facebook' | 'instagram',
  displayName: string,
  scopes: string[],
): OAuthProviderAdapter {
  return {
    platform,
    displayName,
    scopes,
    isConfigured: configured,
    buildAuthorizationUrl({ state, redirectUri, forceConsent }) {
      const url = new URL(
        `https://www.facebook.com/${config.oauth.meta.graphVersion}/dialog/oauth`,
      );
      url.search = formBody({
        client_id: config.oauth.meta.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(','),
        state,
        auth_type: forceConsent ? 'rerequest' : undefined,
      }).toString();
      return url.toString();
    },
    exchangeCode({ code, redirectUri }) {
      return exchangeMetaCode(code, redirectUri).then((token) => ({ ...token, scopes }));
    },
    discoverAccounts(tokens) {
      return discoverMetaAccounts(platform, tokens);
    },
    async revokeAccess(accessToken) {
      const url = new URL(`${graphBase()}/me/permissions`);
      url.searchParams.set('access_token', accessToken);
      await requestProviderJson<unknown>('Meta', url, { method: 'DELETE' });
    },
    async fetchAnalytics({ accessToken, providerAccountId, from, to, cursor, limit }) {
      const authorization = (url: URL) => {
        url.searchParams.set('access_token', accessToken);
        return url;
      };
      if (platform === 'instagram') {
        const profileUrl = authorization(
          new URL(`${graphBase()}/${encodeURIComponent(providerAccountId)}`),
        );
        profileUrl.searchParams.set('fields', 'followers_count,follows_count,media_count');
        const mediaUrl = authorization(
          new URL(`${graphBase()}/${encodeURIComponent(providerAccountId)}/media`),
        );
        mediaUrl.searchParams.set(
          'fields',
          'id,caption,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        );
        mediaUrl.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)));
        if (cursor) mediaUrl.searchParams.set('after', cursor);
        const [profile, media] = await Promise.all([
          requestProviderJson<InstagramProfileResponse>('Instagram', profileUrl),
          requestProviderJson<InstagramMediaResponse>('Instagram', mediaUrl),
        ]);
        const posts = (media.data ?? [])
          .filter((item) => {
            if (!item.timestamp) return true;
            const timestamp = new Date(item.timestamp).getTime();
            return timestamp >= from.getTime() && timestamp <= to.getTime();
          })
          .map((item) => {
            const engagement = (item.like_count ?? 0) + (item.comments_count ?? 0);
            return {
              id: item.id,
              content: item.caption,
              publishedAt: item.timestamp,
              url: item.permalink,
              thumbnail: item.thumbnail_url ?? item.media_url,
              metrics: {
                likes: item.like_count,
                comments: item.comments_count,
                engagement,
              },
            };
          });
        return {
          metrics: {
            followers: profile.followers_count,
            following: profile.follows_count,
            posts: posts.length,
            engagement: posts.reduce(
              (sum, post) => sum + (post.metrics.engagement ?? 0),
              0,
            ),
          },
          history: [],
          posts,
          unavailable: ['reach', 'impressions', 'views', 'audience', 'history'],
          nextCursor: media.paging?.cursors?.after,
        };
      }

      const pageUrl = authorization(
        new URL(`${graphBase()}/${encodeURIComponent(providerAccountId)}`),
      );
      pageUrl.searchParams.set('fields', 'followers_count,fan_count');
      const postsUrl = authorization(
        new URL(`${graphBase()}/${encodeURIComponent(providerAccountId)}/published_posts`),
      );
      postsUrl.searchParams.set(
        'fields',
        'id,message,created_time,permalink_url,full_picture,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)',
      );
      postsUrl.searchParams.set('since', String(Math.floor(from.getTime() / 1000)));
      postsUrl.searchParams.set('until', String(Math.floor(to.getTime() / 1000)));
      postsUrl.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)));
      if (cursor) postsUrl.searchParams.set('after', cursor);
      const [page, feed] = await Promise.all([
        requestProviderJson<FacebookPageResponse>('Facebook', pageUrl),
        requestProviderJson<FacebookPostsResponse>('Facebook', postsUrl),
      ]);
      const posts = (feed.data ?? []).map((item) => {
        const likes = item.reactions?.summary?.total_count ?? 0;
        const comments = item.comments?.summary?.total_count ?? 0;
        const shares = item.shares?.count ?? 0;
        return {
          id: item.id,
          content: item.message,
          publishedAt: item.created_time,
          url: item.permalink_url,
          thumbnail: item.full_picture,
          metrics: {
            likes,
            comments,
            shares,
            engagement: likes + comments + shares,
          },
        };
      });
      return {
        metrics: {
          followers: page.followers_count ?? page.fan_count,
          posts: posts.length,
          engagement: posts.reduce(
            (sum, post) => sum + (post.metrics.engagement ?? 0),
            0,
          ),
        },
        history: [],
        posts,
        unavailable: [
          'following',
          'reach',
          'impressions',
          'views',
          'audience',
          'history',
        ],
        nextCursor: feed.paging?.cursors?.after,
      };
    },
  };
}

export const facebookAdapter = metaAdapter('facebook', 'Facebook', [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
]);

export const instagramAdapter = metaAdapter('instagram', 'Instagram', [
  'pages_show_list',
  'business_management',
  'instagram_basic',
  'instagram_manage_insights',
]);
