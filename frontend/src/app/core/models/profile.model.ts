/** Mirrors Users/DTOs/UserDto.cs + ProfileUpdateDto.cs + ChangePasswordDto.cs exactly.
 *  NOTE: no loyaltyPoints/memberTier/address/savedCards fields exist on the backend. */
export interface UserDto {
  id: number;
  userCustomId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleName: string;
  status: string;
  createdAt: string;
  profilePhotoUrl?: string | null;
  walletBalance: number;
}

export interface ProfileUpdateDto {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
