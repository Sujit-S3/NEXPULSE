import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useTheme } from "@theme/useTheme";
import { useSettings, useUpdateSettings } from "../core/hooks/useSettings";
import type { WorkspacePersonalization, WorkspacePreset } from "../core/types";

const DEFAULT_WIDGET_ORDER = ["followers", "reach", "impressions", "engagementRate", "views", "posts"];

export const defaultPersonalization: WorkspacePersonalization = {
  density: "comfortable",
  accentColor: "blue",
  motionIntensity: "balanced",
  glassTransparency: 0.72,
  sidebarWidth: 260,
  dashboardWidgetOrder: DEFAULT_WIDGET_ORDER,
  presets: [],
};

interface PersonalizationContextValue {
  preferences: WorkspacePersonalization;
  isLoading: boolean;
  isSaving: boolean;
  update: (updates: Partial<WorkspacePersonalization>) => void;
  reorderWidget: (sourceId: string, targetId: string) => void;
  savePreset: (name: string) => void;
  applyPreset: (preset: WorkspacePreset) => void;
  deletePreset: (presetId: string) => void;
}

const noop = () => undefined;
const PersonalizationContext = createContext<PersonalizationContextValue>({
  preferences: defaultPersonalization,
  isLoading: false,
  isSaving: false,
  update: noop,
  reorderWidget: noop,
  savePreset: noop,
  applyPreset: noop,
  deletePreset: noop,
});

const accents = {
  blue: { primary: "#3B82F6", hover: "#60A5FA", secondary: "#38BDF8", rgb: "59, 130, 246" },
  cyan: { primary: "#0891B2", hover: "#06B6D4", secondary: "#22D3EE", rgb: "8, 145, 178" },
  green: { primary: "#059669", hover: "#10B981", secondary: "#34D399", rgb: "5, 150, 105" },
  orange: { primary: "#EA580C", hover: "#F97316", secondary: "#FB923C", rgb: "234, 88, 12" },
} as const;

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { resolved } = useTheme();
  const preferences = settings.data?.workspace ?? defaultPersonalization;

  useEffect(() => {
    const root = document.documentElement;
    const accent = accents[preferences.accentColor];
    root.dataset["density"] = preferences.density;
    root.dataset["motionIntensity"] = preferences.motionIntensity;
    root.style.setProperty("--color-accent", accent.primary);
    root.style.setProperty("--color-accent-hover", accent.hover);
    root.style.setProperty("--color-blue", accent.secondary);
    root.style.setProperty("--color-accent-muted", `rgba(${accent.rgb}, 0.14)`);
    root.style.setProperty("--sidebar-width", `${preferences.sidebarWidth}px`);
    root.style.setProperty("--workspace-glass-alpha", String(preferences.glassTransparency));
    root.style.setProperty(
      "--color-glass",
      resolved === "dark"
        ? `rgba(18, 22, 34, ${preferences.glassTransparency})`
        : `rgba(255, 255, 255, ${preferences.glassTransparency})`,
    );
  }, [preferences, resolved]);

  const update = useCallback((updates: Partial<WorkspacePersonalization>) => {
    updateSettings.mutate({ workspace: { ...preferences, ...updates } });
  }, [preferences, updateSettings]);

  const reorderWidget = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const order = [...preferences.dashboardWidgetOrder];
    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, sourceId);
    update({ dashboardWidgetOrder: order });
  }, [preferences.dashboardWidgetOrder, update]);

  const savePreset = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset: WorkspacePreset = {
      id: crypto.randomUUID(),
      name: trimmed,
      density: preferences.density,
      accentColor: preferences.accentColor,
      motionIntensity: preferences.motionIntensity,
      glassTransparency: preferences.glassTransparency,
      sidebarWidth: preferences.sidebarWidth,
      dashboardWidgetOrder: preferences.dashboardWidgetOrder,
      createdAt: new Date().toISOString(),
    };
    update({ presets: [preset, ...preferences.presets].slice(0, 12) });
  }, [preferences, update]);

  const applyPreset = useCallback((preset: WorkspacePreset) => {
    update({
      density: preset.density,
      accentColor: preset.accentColor,
      motionIntensity: preset.motionIntensity,
      glassTransparency: preset.glassTransparency,
      sidebarWidth: preset.sidebarWidth,
      dashboardWidgetOrder: preset.dashboardWidgetOrder,
    });
  }, [update]);

  const deletePreset = useCallback((presetId: string) => {
    update({ presets: preferences.presets.filter((preset) => preset.id !== presetId) });
  }, [preferences.presets, update]);

  const value = useMemo<PersonalizationContextValue>(() => ({
    preferences,
    isLoading: settings.isLoading,
    isSaving: updateSettings.isPending,
    update,
    reorderWidget,
    savePreset,
    applyPreset,
    deletePreset,
  }), [
    applyPreset,
    deletePreset,
    preferences,
    reorderWidget,
    savePreset,
    settings.isLoading,
    update,
    updateSettings.isPending,
  ]);

  return <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>;
}

export function usePersonalization() {
  return useContext(PersonalizationContext);
}
