/**
 * Shared TypeScript types for NEXPULSE AI.
 *
 * These types are used by both client and server to ensure
 * type safety across the API boundary.
 */

// User
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Platform
export interface Platform {
  id: string;
  name: string;
  type: PlatformType;
  connected: boolean;
}

export type PlatformType =
  | "twitter"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube";
