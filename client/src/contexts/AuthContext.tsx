import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { authApi } from "../services/auth";
import type { MfaChallenge, MfaMethod, User, RegisterPayload, UpdateProfilePayload } from "../types";

let accessTokenValue: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenValue;
}

export function setAccessToken(token: string | null): void {
  accessTokenValue = token;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<MfaChallenge | { enrollmentRequired: boolean }>;
  verifyMfa: (challengeToken: string, method: MfaMethod, code: string, rememberDevice: boolean) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfilePayload) => Promise<User>;
  uploadAvatar: (file: File) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const baseURL = import.meta.env["VITE_API_URL"] ?? "http://localhost:4000";
      const { data } = await axios.post(
        `${baseURL}/api/v1/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const { user: userData, accessToken } = data.data;
      setAccessToken(accessToken);
      setUser(userData);
    } catch {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    refreshAuth().finally(() => setIsLoading(false));
  }, [location.pathname, refreshAuth]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const { data } = await authApi.login({ email, password, rememberMe });
      if (data.data.mfaRequired) return data.data as MfaChallenge;
      const { user: userData, accessToken } = data.data;
      setAccessToken(accessToken);
      setUser(userData);
      return { enrollmentRequired: Boolean(userData.mfa?.enrollmentRequired) };
    },
    [],
  );

  const verifyMfa = useCallback(
    async (challengeToken: string, method: MfaMethod, code: string, rememberDevice: boolean) => {
      const { data } = await authApi.verifyMfa({ challengeToken, method, code, rememberDevice });
      const { user: userData, accessToken } = data.data;
      setAccessToken(accessToken);
      setUser(userData);
    },
    [],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    const { data } = await authApi.register(payload);
    const { user: userData, accessToken } = data.data;
    setAccessToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<User> => {
      const { data } = await authApi.updateProfile(payload);
      const updatedUser = data.data;
      setUser(updatedUser);
      return updatedUser;
    },
    [],
  );

  const uploadAvatar = useCallback(async (file: File): Promise<User> => {
    const { data } = await authApi.uploadAvatar(file);
    const updatedUser = data.data;
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: newPassword,
      });
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      verifyMfa,
      register,
      logout,
      updateProfile,
      uploadAvatar,
      changePassword,
    }),
    [user, isLoading, login, verifyMfa, register, logout, updateProfile, uploadAvatar, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
