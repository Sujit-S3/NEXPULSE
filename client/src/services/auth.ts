import api from "../lib/axios";
import type {
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  MfaMethod,
} from "../types";

export const authApi = {
  login: (data: LoginPayload) => api.post("/api/v1/auth/login", data),
  verifyMfa: (data: {
    challengeToken: string;
    method: MfaMethod;
    code: string;
    rememberDevice: boolean;
  }) => api.post("/api/v1/auth/mfa/verify", data),
  register: (data: RegisterPayload) => api.post("/api/v1/auth/register", data),
  logout: () => api.post("/api/v1/auth/logout"),
  refresh: () => api.post("/api/v1/auth/refresh"),
  getMe: () => api.get("/api/v1/auth/me"),
  updateProfile: (data: UpdateProfilePayload) =>
    api.patch("/api/v1/auth/profile", data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.post("/api/v1/auth/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => api.patch("/api/v1/auth/password", data),
  forgotPassword: (email: string) =>
    api.post("/api/v1/auth/forgot-password", { email }),
  resetPassword: (data: {
    token: string;
    password: string;
    confirmPassword: string;
  }) => api.post("/api/v1/auth/reset-password", data),
  verifyEmail: (token: string) =>
    api.post("/api/v1/auth/verify-email", { token }),
  resendVerification: (email: string) =>
    api.post("/api/v1/auth/resend-verification", { email }),
};
