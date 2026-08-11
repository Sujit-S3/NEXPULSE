/**
 * OFFICIAL BRAND ASSETS FOR NEXPULSE AI
 *
 * Production brand identity assets:
 * 1. AssistantLogo: /branding/ai-assistant.png (AI features)
 * 2. MainLightLogo: /branding/main-light.png (Light Theme)
 * 3. MainDarkLogo: /branding/main-dark.png (Dark Theme)
 */

export const MainLightLogo = "/branding/main-light.png";
export const MainDarkLogo = "/branding/main-dark.png";
export const AssistantLogo = "/branding/ai-assistant.png";

/**
 * Resolves the official main brand logo URL based on current active theme.
 */
export function getThemeLogo(theme: "light" | "dark" | string): string {
  return theme === "light" ? MainLightLogo : MainDarkLogo;
}

/**
 * Resolves brand asset URL automatically based on feature type (AI vs main) and theme.
 */
export function getBrandAsset({
  isAIFeature = false,
  theme = "dark",
}: {
  isAIFeature?: boolean;
  theme?: "light" | "dark" | string;
} = {}): string {
  if (isAIFeature) return AssistantLogo;
  return getThemeLogo(theme);
}
