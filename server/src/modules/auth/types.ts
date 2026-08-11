export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  workspaceId: string;
  sessionId: string;
  securityStamp: number;
}

export interface SanitizedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  workspaceId: string;
  organizationId?: string;
  permissions: string[];
  mfa: { enabled: boolean; emailOtpEnabled: boolean; enrollmentRequired: boolean };
  preferences: {
    theme?: string;
    notifications?: boolean;
    timezone?: string;
    language?: string;
    emailReports?: boolean;
    digestFrequency?: 'daily' | 'weekly' | 'monthly';
    autoSync?: boolean;
    syncInterval?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse {
  user: SanitizedUser;
  accessToken: string;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  challengeToken: string;
  methods: ('totp' | 'email' | 'recovery')[];
}

export interface RegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  invitationToken?: string;
}

export interface LoginBody {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    timezone?: string;
    language?: string;
    emailReports?: boolean;
    digestFrequency?: 'daily' | 'weekly' | 'monthly';
    autoSync?: boolean;
    syncInterval?: number;
  };
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailBody {
  token: string;
}

export type UserRole =
  | 'super_admin'
  | 'organization_owner'
  | 'workspace_owner'
  | 'workspace_admin'
  | 'manager'
  | 'editor'
  | 'analyst'
  | 'viewer'
  | 'guest'
  | 'service_account';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type WorkspacePlan = 'free' | 'starter' | 'professional' | 'enterprise';
