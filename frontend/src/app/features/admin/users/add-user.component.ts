import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ValidationService } from '../../../core/services/validation.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { RoleDto } from '../../../core/models/admin-user.model';
import { HotelResponseDto } from '../../../core/models/hotel.model';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';

/**
 * Wired to the real backend: POST api/admin/users for Customer/Admin roles,
 * POST api/admin/users/managers for the Manager role (which requires an
 * AssignedHotelId instead of a plain RoleId body field).
 */
@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
  private readonly validation = inject(ValidationService);
  private readonly ui = inject(GlobalUiService);
  private readonly router = inject(Router);
  private readonly usersService = inject(AdminUsersService);
  private readonly http = inject(HttpClient);

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  showPassword = false;

  role = ''; // role name selected in the UI: 'Customer' | 'Manager'
  branch = ''; // hotel id (string) for Manager

  accountActive = true;

  roles: RoleDto[] = [];
  hotels: HotelResponseDto[] = [];

  errors: Record<string, string> = {};
  submitting = false;

  successInfo: {
    id: string; name: string; role: string; branchName: string; password: string;
  } | null = null;

  ngOnInit(): void {
    this.usersService.getRoles().subscribe({
      next: res => this.roles = (res.data || []).filter(r => r.name !== 'Admin')
    });
    this.http.get<ApiResponse<HotelResponseDto[]>>(`${environment.apiUrl}/hotels`).subscribe({
      next: res => this.hotels = res.data || []
    });
  }

  get passwordType(): string {
    return this.showPassword ? 'text' : 'password';
  }

  get branchRequired(): boolean {
    return this.role === 'Manager';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onRoleChange(): void {
    if (this.role !== 'Manager') {
      this.branch = '';
    }
  }

  hasError(field: string): boolean {
    return !!this.errors[field];
  }

  private setError(field: string, message: string): void {
    this.errors[field] = message;
  }

  private clearError(field: string): void {
    delete this.errors[field];
  }

  validateFirstName(): boolean {
    if (!this.firstName.trim()) {
      this.setError('firstName', 'First name is required.');
      return false;
    }
    this.clearError('firstName');
    return true;
  }

  validateLastName(): boolean {
    if (!this.lastName.trim()) {
      this.setError('lastName', 'Last name is required.');
      return false;
    }
    this.clearError('lastName');
    return true;
  }

  validateEmail(): boolean {
    if (!this.email.trim() || !this.validation.isValidEmail(this.email)) {
      this.setError('email', 'Please enter a valid email address (e.g. user@example.com).');
      return false;
    }
    this.clearError('email');
    return true;
  }

  validatePhone(): boolean {
    if (!/^[6-9]\d{9}$/.test(this.phone.trim())) {
      this.setError('phone', 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.');
      return false;
    }
    this.clearError('phone');
    return true;
  }

  validatePassword(): boolean {
    if (!/^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(this.password)) {
      this.setError('password', 'Password must be at least 8 characters with one digit and one special character.');
      return false;
    }
    this.clearError('password');
    return true;
  }

  validateRole(): boolean {
    if (!this.role) {
      this.setError('role', 'Please select a role.');
      return false;
    }
    this.clearError('role');
    return true;
  }

  validateBranch(): boolean {
    if (this.branchRequired && !this.branch) {
      this.setError('branch', 'Please select a branch for hotel managers.');
      return false;
    }
    this.clearError('branch');
    return true;
  }

  hasFormData(): boolean {
    return !!(this.firstName.trim() || this.lastName.trim() || this.email.trim() || this.phone.trim() || this.password.trim());
  }

  cancel(): void {
    if (this.hasFormData() && !confirm('Discard changes and return to User Management?')) {
      return;
    }
    this.router.navigate(['/admin/users']);
  }

  onSubmit(): void {
    const v1 = this.validateFirstName();
    const v2 = this.validateLastName();
    const v3 = this.validateEmail();
    const v4 = this.validatePhone();
    const v5 = this.validatePassword();
    const v6 = this.validateRole();
    const v7 = this.validateBranch();

    if (!(v1 && v2 && v3 && v4 && v5 && v6 && v7)) {
      return;
    }

    this.submitting = true;

    if (this.role === 'Manager') {
      const hotel = this.hotels.find(h => String(h.id) === this.branch);
      this.usersService.createManager({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        temporaryPassword: this.password,
        assignedHotelId: Number(this.branch)
      }).subscribe({
        next: res => {
          this.submitting = false;
          this.successInfo = {
            id: res.data.userCustomId || String(res.data.id),
            name: `${this.firstName} ${this.lastName}`,
            role: this.role,
            branchName: hotel?.name || 'Unassigned',
            password: this.password
          };
        },
        error: err => {
          this.submitting = false;
          this.ui.showToast(err?.error?.errors?.[0] || err?.error?.message || 'Failed to create manager.');
        }
      });
      return;
    }

    const roleId = this.roles.find(r => r.name === this.role)?.id;
    if (!roleId) {
      this.submitting = false;
      this.setError('role', 'Unable to resolve role. Please retry.');
      return;
    }

    this.usersService.createUser({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      roleId,
      phone: this.phone,
      status: this.accountActive ? 'Active' : 'Inactive'
    }).subscribe({
      next: res => {
        this.submitting = false;
        this.successInfo = {
          id: res.data.userCustomId || String(res.data.id),
          name: `${this.firstName} ${this.lastName}`,
          role: this.role,
          branchName: 'N/A',
          password: this.password
        };
      },
      error: err => {
        this.submitting = false;
        this.ui.showToast(err?.error?.errors?.[0] || err?.error?.message || 'Failed to create user.');
      }
    });
  }

  closeSuccessModal(): void {
    this.successInfo = null;
    this.router.navigate(['/admin/users']);
  }
}
