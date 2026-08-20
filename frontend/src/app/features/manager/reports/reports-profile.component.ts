import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ChangePasswordDto, ProfileUpdateDto, UserDto } from '../../../core/models/manager.model';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

/** Manager's own profile page — wired to GET/PUT api/profile, POST change-password, GET/POST api/profile/photo. */
@Component({
  selector: 'app-manager-reports-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">My Profile</li>
        </ol>
      </nav>
      <h1 class="font-serif fw-bold text-purple h2 mb-4">Manager Profile</h1>

      @if (loading()) {
        <p class="text-muted">Loading profile...</p>
      } @else {
        <div class="card border shadow-sm bg-white p-4 mb-4" style="border-radius:12px;max-width:600px;">
          <div class="d-flex align-items-center gap-3 mb-4">
            @if (user()?.profilePhotoUrl) {
              <img [src]="user()!.profilePhotoUrl" alt="Profile photo" class="rounded-circle" style="width:64px;height:64px;object-fit:cover;" />
            } @else {
              <div class="profile-avatar-circle" style="width:64px;height:64px;font-size:1.4rem;">{{ initials() }}</div>
            }
            <div>
              <h5 class="fw-bold mb-0">{{ user()?.firstName }} {{ user()?.lastName }}</h5>
              <span class="text-muted small">{{ user()?.roleName }}</span>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small">Profile Photo</label>
            <input type="file" accept="image/*" class="form-control form-control-sm" (change)="onPhotoSelected($event)" />
            @if (photoError()) { <div class="text-danger small mt-1">{{ photoError() }}</div> }
            @if (photoSuccess()) { <div class="text-success small mt-1">{{ photoSuccess() }}</div> }
          </div>

          <p class="mb-2"><strong>Email:</strong> {{ user()?.email }}</p>

          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small">First Name</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="firstName" />
            </div>
            <div class="col-6">
              <label class="form-label small">Last Name</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="lastName" />
            </div>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small">Phone</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="phone" />
            </div>
            <div class="col-6">
              <label class="form-label small">Date of Birth</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="dateOfBirth" />
            </div>
          </div>
          @if (profileError()) { <div class="text-danger small mt-1">{{ profileError() }}</div> }
          @if (profileSuccess()) { <div class="text-success small mt-1">{{ profileSuccess() }}</div> }
          <button class="btn btn-purple btn-sm mt-2" style="width:fit-content;" (click)="saveProfile()" [disabled]="savingProfile()">
            {{ savingProfile() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>

        <div class="card border shadow-sm bg-white p-4" style="border-radius:12px;max-width:600px;">
          <h6 class="fw-bold text-purple mb-3">Change Password</h6>
          <div class="mb-2">
            <label class="form-label small">Current Password</label>
            <input type="password" class="form-control form-control-sm" [(ngModel)]="currentPassword" />
          </div>
          <div class="mb-2">
            <label class="form-label small">New Password</label>
            <input type="password" class="form-control form-control-sm" [(ngModel)]="newPassword" />
          </div>
          <div class="mb-2">
            <label class="form-label small">Confirm New Password</label>
            <input type="password" class="form-control form-control-sm" [(ngModel)]="confirmNewPassword" />
          </div>
          @if (passwordError()) { <div class="text-danger small mt-1">{{ passwordError() }}</div> }
          @if (passwordSuccess()) { <div class="text-success small mt-1">{{ passwordSuccess() }}</div> }
          <button class="btn btn-purple btn-sm mt-2" style="width:fit-content;" (click)="changePassword()" [disabled]="changingPassword()">
            {{ changingPassword() ? 'Updating...' : 'Change Password' }}
          </button>
        </div>
      }
    </div>
  `
})
export class ReportsProfileComponent implements OnInit {
  private readonly base = environment.apiUrl;

  readonly loading = signal(true);
  readonly user = signal<UserDto | null>(null);

  firstName = '';
  lastName = '';
  phone = '';
  dateOfBirth = '';

  readonly savingProfile = signal(false);
  readonly profileError = signal('');
  readonly profileSuccess = signal('');

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  readonly changingPassword = signal(false);
  readonly passwordError = signal('');
  readonly passwordSuccess = signal('');

  readonly photoError = signal('');
  readonly photoSuccess = signal('');

  readonly initials = signal('M');

  constructor(private http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<UserDto>>(`${this.base}/profile`));
      const u = res.data;
      this.user.set(u);
      this.firstName = u.firstName;
      this.lastName = u.lastName;
      this.phone = u.phone;
      this.initials.set((u.firstName?.[0] || 'M') + (u.lastName?.[0] || ''));
    } finally {
      this.loading.set(false);
    }
  }

  async saveProfile(): Promise<void> {
    this.profileError.set('');
    this.profileSuccess.set('');

    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.profileError.set('First and last name are required.');
      return;
    }
    if (!PHONE_REGEX.test(this.phone)) {
      this.profileError.set('Phone must be a 10-digit number starting with 6-9.');
      return;
    }

    const dto: ProfileUpdateDto = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phone: this.phone,
      dateOfBirth: this.dateOfBirth
    };

    this.savingProfile.set(true);
    try {
      const res = await firstValueFrom(this.http.put<ApiResponse<UserDto>>(`${this.base}/profile/edit`, dto));
      this.user.set(res.data);
      this.profileSuccess.set('Profile updated successfully.');
    } catch (err) {
      this.profileError.set(this.extractError(err) || 'Failed to update profile.');
    } finally {
      this.savingProfile.set(false);
    }
  }

  async changePassword(): Promise<void> {
    this.passwordError.set('');
    this.passwordSuccess.set('');

    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.passwordError.set('All password fields are required.');
      return;
    }
    if (!PASSWORD_REGEX.test(this.newPassword)) {
      this.passwordError.set('New password must be at least 8 characters and include a number and a special character.');
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError.set('New password and confirmation do not match.');
      return;
    }

    const dto: ChangePasswordDto = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmNewPassword: this.confirmNewPassword
    };

    this.changingPassword.set(true);
    try {
      await firstValueFrom(this.http.post<ApiResponse<null>>(`${this.base}/profile/change-password`, dto));
      this.passwordSuccess.set('Password changed successfully.');
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    } catch (err) {
      this.passwordError.set(this.extractError(err) || 'Failed to change password.');
    } finally {
      this.changingPassword.set(false);
    }
  }

  async onPhotoSelected(event: Event): Promise<void> {
    this.photoError.set('');
    this.photoSuccess.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('File', file);

    try {
      const res = await firstValueFrom(this.http.post<ApiResponse<string>>(`${this.base}/profile/photo`, form));
      const current = this.user();
      if (current) {
        this.user.set({ ...current, profilePhotoUrl: res.data });
      }
      this.photoSuccess.set('Profile photo uploaded successfully.');
    } catch (err) {
      this.photoError.set(this.extractError(err) || 'Failed to upload photo.');
    } finally {
      input.value = '';
    }
  }

  private extractError(err: unknown): string | null {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiResponse<unknown> | undefined;
      if (body?.message) return body.message;
      if (body?.errors?.length) return body.errors.join(' ');
    }
    return null;
  }
}
