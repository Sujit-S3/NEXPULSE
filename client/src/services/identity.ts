import api from "../lib/axios";
import type { ApiResponse } from "../types";

export interface IdentitySession {
  id: string;
  current: boolean;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  ipAddress: string;
  riskScore: number;
  authMethods: string[];
  lastActiveAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface MfaStatus {
  enabled: boolean;
  totpEnabled: boolean;
  emailOtpEnabled: boolean;
  recoveryCodesRemaining: number;
  trustedDevices: { id: string; name: string; trustedAt: string; expiresAt: string }[];
}

export interface ApiCredential {
  id: string;
  type: "api_key" | "personal_access_token";
  name: string;
  prefix: string;
  permissions: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface ServiceAccount {
  id: string;
  name: string;
  description?: string;
  purpose: "automation" | "integration" | "bot" | "ci_cd";
  permissions: string[];
  status: "active" | "disabled";
  lastUsedAt?: string;
  createdAt: string;
}

export interface IdentityInfo {
  roles: string[];
  permissions: string[];
  rolePermissions: Record<string, string[]>;
  security: { encryptionConfigured: boolean; sessionIdleTimeoutMinutes: number };
}

export interface SecurityEvent {
  id: string;
  type: string;
  outcome: "success" | "failure" | "denied";
  ipAddress?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  status: string;
  joinedAt?: string;
  lastLogin?: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "declined" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

export const identityApi = {
  info: async () => (await api.get<ApiResponse<IdentityInfo>>("/api/v1/identity/info")).data.data,
  sessions: async () => (await api.get<ApiResponse<IdentitySession[]>>("/api/v1/identity/sessions")).data.data,
  revokeSession: (sessionId: string) => api.delete(`/api/v1/identity/sessions/${sessionId}`),
  revokeOtherSessions: () => api.post("/api/v1/identity/sessions/revoke-others"),
  mfaStatus: async () => (await api.get<ApiResponse<MfaStatus>>("/api/v1/identity/mfa")).data.data,
  beginTotp: async (password: string) => (
    await api.post<ApiResponse<{ secret: string; uri: string }>>("/api/v1/identity/mfa/totp/setup", { password })
  ).data.data,
  confirmTotp: async (code: string) => (
    await api.post<ApiResponse<{ recoveryCodes: string[] }>>("/api/v1/identity/mfa/totp/confirm", { code })
  ).data.data,
  enableEmailOtp: async (password: string) => (
    await api.post<ApiResponse<{ enabled: true; recoveryCodes?: string[] }>>("/api/v1/identity/mfa/email/enable", { password })
  ).data.data,
  regenerateRecoveryCodes: async (code: string) => (
    await api.post<ApiResponse<{ recoveryCodes: string[] }>>("/api/v1/identity/mfa/recovery/regenerate", { code })
  ).data.data,
  disableMfa: (password: string, code: string) => api.delete("/api/v1/identity/mfa", { data: { password, code } }),
  removeTrustedDevice: (deviceId: string) => api.delete(`/api/v1/identity/mfa/trusted-devices/${deviceId}`),
  credentials: async () => (await api.get<ApiResponse<ApiCredential[]>>("/api/v1/identity/credentials")).data.data,
  createCredential: async (data: { type: "api_key" | "personal_access_token"; name: string; permissions: string[]; expiresAt?: string }) => (
    await api.post<ApiResponse<{ credential: ApiCredential; token: string }>>("/api/v1/identity/credentials", data)
  ).data.data,
  revokeCredential: (credentialId: string) => api.delete(`/api/v1/identity/credentials/${credentialId}`),
  rotateCredential: async (credentialId: string) => (
    await api.post<ApiResponse<{ credential: ApiCredential; token: string }>>(`/api/v1/identity/credentials/${credentialId}/rotate`)
  ).data.data,
  serviceAccounts: async () => (await api.get<ApiResponse<ServiceAccount[]>>("/api/v1/identity/service-accounts")).data.data,
  createServiceAccount: async (data: { name: string; purpose: ServiceAccount["purpose"]; permissions: string[] }) => (
    await api.post<ApiResponse<{ account: ServiceAccount; token: string }>>("/api/v1/identity/service-accounts", data)
  ).data.data,
  rotateServiceToken: async (serviceAccountId: string) => (
    await api.post<ApiResponse<{ token: string }>>(`/api/v1/identity/service-accounts/${serviceAccountId}/rotate`)
  ).data.data,
  disableServiceAccount: (serviceAccountId: string) => api.delete(`/api/v1/identity/service-accounts/${serviceAccountId}`),
  securityEvents: async () => (
    await api.get<ApiResponse<{ items: SecurityEvent[] }>>("/api/v1/identity/security-events?limit=10")
  ).data.data.items,
  members: async () => (await api.get<ApiResponse<WorkspaceMember[]>>("/api/v1/identity/members")).data.data,
  updateMemberRole: (memberId: string, role: string) => api.patch(`/api/v1/identity/members/${memberId}/role`, { role }),
  removeMember: (memberId: string) => api.delete(`/api/v1/identity/members/${memberId}`),
  invitations: async () => (await api.get<ApiResponse<WorkspaceInvitation[]>>("/api/v1/identity/invitations")).data.data,
  createInvitation: async (email: string, role: string) => (
    await api.post<ApiResponse<WorkspaceInvitation>>("/api/v1/identity/invitations", { email, role })
  ).data.data,
  resendInvitation: (invitationId: string) => api.post(`/api/v1/identity/invitations/${invitationId}/resend`),
  revokeInvitation: (invitationId: string) => api.delete(`/api/v1/identity/invitations/${invitationId}`),
  respondToInvitation: (token: string, action: "accept" | "decline") => api.post("/api/v1/identity/invitations/respond", { token, action }),
};
