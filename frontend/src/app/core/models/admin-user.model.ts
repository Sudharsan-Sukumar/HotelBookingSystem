/** Mirrors Users/DTOs/UserDto.cs exactly. Returned by GET/POST/PUT under api/admin/users. */
export interface AdminUserDto {
  id: number;
  userCustomId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleName: string;
  status: string;
  createdAt: string;
  profilePhotoUrl: string | null;
}

/** Mirrors Users/DTOs/CreateUserDto.cs. POST api/admin/users. */
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: number;
  phone: string;
  status: string;
}

/** Mirrors Users/DTOs/UpdateUserDto.cs. PUT api/admin/users/{id}. */
export interface UpdateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  roleId: number;
  phone: string;
  status: string;
}

/** Mirrors Users/DTOs/CreateManagerDto.cs. POST api/admin/users/managers. */
export interface CreateManagerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  assignedHotelId: number;
}

/** Mirrors Users/DTOs/ManagerDto.cs. GET api/admin/approvals/managers/pending. */
export interface ManagerDto {
  id: number;
  userCustomId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

/** Mirrors Users/Controllers/AdminBanController.cs' BanRequestDto. */
export interface BanRequestDto {
  reason: string;
}

/** Mirrors Users/Models/Role.cs as returned by GET api/roles. */
export interface RoleDto {
  id: number;
  name: string;
}
