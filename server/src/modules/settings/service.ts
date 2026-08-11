import { NotFoundError } from '../../errors/index.js';
import { userRepository } from '../auth/repository.js';
import type { IUser } from '../auth/model.js';

const DEFAULT_WIDGET_ORDER = [
  'followers', 'reach', 'impressions', 'engagementRate', 'views', 'posts',
];

export interface WorkspacePersonalization {
  density: 'compact' | 'comfortable' | 'spacious';
  accentColor: 'blue' | 'cyan' | 'green' | 'orange';
  motionIntensity: 'reduced' | 'balanced' | 'full';
  glassTransparency: number;
  sidebarWidth: number;
  dashboardWidgetOrder: string[];
  presets: {
    id: string;
    name: string;
    density: 'compact' | 'comfortable' | 'spacious';
    accentColor: 'blue' | 'cyan' | 'green' | 'orange';
    motionIntensity: 'reduced' | 'balanced' | 'full';
    glassTransparency: number;
    sidebarWidth: number;
    dashboardWidgetOrder: string[];
    createdAt: string;
  }[];
}

export interface SettingsData {
  theme: string;
  notifications: boolean;
  timezone: string;
  language: string;
  emailReports: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
  autoSync: boolean;
  syncInterval: number;
  workspace: WorkspacePersonalization;
}

type WorkspacePresetInput = Omit<WorkspacePersonalization['presets'][number], 'createdAt'> & {
  createdAt: string | Date;
};

type SettingsUpdate = Partial<Omit<SettingsData, 'workspace'>> & {
  workspace?: Partial<Omit<WorkspacePersonalization, 'presets'>> & {
    presets?: WorkspacePresetInput[];
  };
};

function settings(user: IUser): SettingsData {
  return {
    theme: user.preferences.theme ?? 'system',
    notifications: user.preferences.notifications ?? true,
    timezone: user.preferences.timezone ?? 'UTC',
    language: user.preferences.language ?? 'en',
    emailReports: user.preferences.emailReports ?? false,
    digestFrequency: user.preferences.digestFrequency ?? 'weekly',
    autoSync: user.preferences.autoSync ?? true,
    syncInterval: user.preferences.syncInterval ?? 60,
    workspace: {
      density: user.preferences.workspace?.density ?? 'comfortable',
      accentColor: user.preferences.workspace?.accentColor ?? 'blue',
      motionIntensity: user.preferences.workspace?.motionIntensity ?? 'balanced',
      glassTransparency: user.preferences.workspace?.glassTransparency ?? 0.72,
      sidebarWidth: user.preferences.workspace?.sidebarWidth ?? 260,
      dashboardWidgetOrder: user.preferences.workspace?.dashboardWidgetOrder?.length
        ? user.preferences.workspace.dashboardWidgetOrder
        : DEFAULT_WIDGET_ORDER,
      presets: (user.preferences.workspace?.presets ?? []).map((preset) => ({
        ...preset,
        createdAt: preset.createdAt.toISOString(),
      })),
    },
  };
}

export const settingsService = {
  async get(userId: string): Promise<SettingsData> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return settings(user);
  },

  async update(userId: string, updates: SettingsUpdate): Promise<SettingsData> {
    const current = await userRepository.findById(userId);
    if (!current) throw new NotFoundError('User not found');
    const workspace = updates.workspace
      ? {
          ...current.preferences.workspace,
          ...updates.workspace,
          presets: updates.workspace.presets?.map((preset) => ({
            ...preset,
            createdAt: new Date(preset.createdAt),
          })) ?? current.preferences.workspace?.presets,
        }
      : current.preferences.workspace;
    const user = await userRepository.updateById(userId, {
      preferences: {
        ...current.preferences,
        ...updates,
        workspace,
      },
    });
    if (!user) throw new NotFoundError('User not found');
    return settings(user);
  },
};
