/**
 * Shared constants for NEXPULSE AI.
 *
 * Constants that are referenced by both client and server should be defined here.
 */

// API
export const API_PREFIX = "/api";

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Auth
export const JWT_ACCESS_TTL = "15m";
export const JWT_REFRESH_TTL = "7d";

// Platforms
export const SUPPORTED_PLATFORMS = [
  "twitter",
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];
