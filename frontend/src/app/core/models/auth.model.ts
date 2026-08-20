/** Mirrors Authentication/DTOs/*.cs exactly — field names/casing match the JSON the backend serializes. */

export type UserRole = 'Admin' | 'Customer' | 'Manager';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date (yyyy-MM-dd), DateOnly on the backend
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

export interface VerifyEmailDto {
  email: string;
  token: string; // 6-digit OTP
}

export interface ResendVerificationDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string; // 6-digit OTP
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken?: string;
}

export interface AuthResponseDto {
  token: string;
  refreshToken?: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  forcePasswordChange: boolean;
}
