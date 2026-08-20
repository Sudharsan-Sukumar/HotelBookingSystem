import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AdminUserDto, CreateUserDto, UpdateUserDto, CreateManagerDto, ManagerDto, BanRequestDto, RoleDto
} from '../models/admin-user.model';

/** Real HTTP client for Users/Controllers/AdminUsersController.cs, AdminBanController.cs and
 *  AdminApprovalController.cs (routes under api/admin/users, api/admin/bans, api/admin/approvals). */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly base = `${environment.apiUrl}/admin/users`;
  private readonly banBase = `${environment.apiUrl}/admin/bans`;
  private readonly approvalBase = `${environment.apiUrl}/admin/approvals`;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<ApiResponse<AdminUserDto[]>> {
    return this.http.get<ApiResponse<AdminUserDto[]>>(this.base);
  }

  getUser(id: number): Observable<ApiResponse<AdminUserDto>> {
    return this.http.get<ApiResponse<AdminUserDto>>(`${this.base}/${id}`);
  }

  createUser(dto: CreateUserDto): Observable<ApiResponse<AdminUserDto>> {
    return this.http.post<ApiResponse<AdminUserDto>>(this.base, dto);
  }

  updateUser(id: number, dto: UpdateUserDto): Observable<ApiResponse<AdminUserDto>> {
    return this.http.put<ApiResponse<AdminUserDto>>(`${this.base}/${id}`, dto);
  }

  deleteUser(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }

  createManager(dto: CreateManagerDto): Observable<ApiResponse<AdminUserDto>> {
    return this.http.post<ApiResponse<AdminUserDto>>(`${this.base}/managers`, dto);
  }

  getRoles(): Observable<ApiResponse<RoleDto[]>> {
    return this.http.get<ApiResponse<RoleDto[]>>(`${environment.apiUrl}/roles`);
  }

  banUser(id: number, dto: BanRequestDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.banBase}/users/${id}/ban`, dto);
  }

  unbanUser(id: number, dto: BanRequestDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.banBase}/users/${id}/unban`, dto);
  }

  getPendingManagers(): Observable<ApiResponse<ManagerDto[]>> {
    return this.http.get<ApiResponse<ManagerDto[]>>(`${this.approvalBase}/managers/pending`);
  }

  approveManager(id: number): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.approvalBase}/managers/${id}/approve`, {});
  }

  rejectManager(id: number): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.approvalBase}/managers/${id}/reject`, {});
  }
}
