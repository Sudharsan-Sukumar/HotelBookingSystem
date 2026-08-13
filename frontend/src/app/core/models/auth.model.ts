// Mirrors HotelBooking.API/Authentication/DTOs

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // yyyy-MM-dd
  email: string;
  password: string;
  phone: string;
}

export interface VerifyEmailDto {
  email: string;
  token: string;
}

export interface ResendVerificationDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  token: string;
  refreshToken?: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  forcePasswordChange: boolean;
}
