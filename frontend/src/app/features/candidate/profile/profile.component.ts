import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { ProfileService } from '../../../core/services/profile.service';
import { UserDto } from '../../../core/models/profile.model';

/** Backend regexes (Common/Constants/ValidationRegexConstants.cs) mirrored client-side for
 *  immediate feedback — the server re-validates regardless. */
const NAME_REGEX = /^[a-zA-Z\s.\-]{2,80}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB client-side guard; server compresses to <=500KB itself.

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: UserDto | null = null;
  joinDate = '';
  initials = '';
  photoUrl: string | null = null;
  isUploadingPhoto = false;
  photoErrorMsg = '';

  isEditing = false;

  firstName = '';
  lastName = '';
  mobilePhone = '';
  dateOfBirth = '';

  firstNameErrVisible = false;
  lastNameErrVisible = false;
  mobilePhoneErrVisible = false;
  profileErrorMsg = '';

  profileSuccessMsg = '';

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  newPasswordErrVisible = false;
  confirmPasswordErrVisible = false;
  oldPasswordErrVisible = false;
  pwdErrorMsg = '';
  pwdSuccessMsg = '';

  logoutAllConfirmVisible = false;
  loggingOutAll = false;
  logoutAllErrorMsg = '';

  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private ui: GlobalUiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn || this.auth.userRole !== 'Customer') {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.profileService.getOwnProfile().subscribe({
      next: (res) => {
        this.user = res.data;
        this.applyUserToForm();
        if (this.user?.profilePhotoUrl) {
          this.loadPhoto();
        }
      },
      error: () => {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  private applyUserToForm(): void {
    if (!this.user) return;
    this.initials = this.user.firstName && this.user.lastName
      ? (this.user.firstName.charAt(0) + this.user.lastName.charAt(0)).toUpperCase()
      : '';
    this.joinDate = this.user.createdAt
      ? new Date(this.user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    this.firstName = this.user.firstName || '';
    this.lastName = this.user.lastName || '';
    this.mobilePhone = this.user.phone || '';
  }

  private loadPhoto(): void {
    this.profileService.getPhotoBlob().subscribe({
      next: (blob) => { this.photoUrl = URL.createObjectURL(blob); },
      error: () => { /* no photo yet — keep initials avatar */ }
    });
  }

  enableEditing(): void {
    this.isEditing = true;
    this.profileErrorMsg = '';
    this.profileSuccessMsg = '';
  }

  saveProfile(): void {
    if (!this.isEditing || !this.user) return;

    this.firstNameErrVisible = !NAME_REGEX.test(this.firstName.trim());
    this.lastNameErrVisible = !NAME_REGEX.test(this.lastName.trim());
    this.mobilePhoneErrVisible = !PHONE_REGEX.test(this.mobilePhone.trim());

    if (this.firstNameErrVisible || this.lastNameErrVisible || this.mobilePhoneErrVisible) return;

    this.profileErrorMsg = '';

    this.profileService.updateProfile({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phone: this.mobilePhone.trim(),
      dateOfBirth: this.dateOfBirth || new Date().toISOString()
    }).subscribe({
      next: (res) => {
        this.user = res.data;
        this.applyUserToForm();
        this.profileSuccessMsg = 'Profile updated successfully.';
        this.ui.showToast('Profile updated successfully.');
        this.isEditing = false;
      },
      error: (err: HttpErrorResponse) => {
        this.profileErrorMsg = err.error?.message || 'Could not update profile. Please try again.';
      }
    });
  }

  changePassword(): void {
    this.pwdErrorMsg = '';
    this.oldPasswordErrVisible = !this.oldPassword;
    this.newPasswordErrVisible = !PASSWORD_REGEX.test(this.newPassword);
    this.confirmPasswordErrVisible = this.newPassword !== this.confirmPassword || !this.confirmPassword;

    if (this.oldPasswordErrVisible || this.newPasswordErrVisible || this.confirmPasswordErrVisible) return;

    this.profileService.changePassword({
      currentPassword: this.oldPassword,
      newPassword: this.newPassword,
      confirmNewPassword: this.confirmPassword
    }).subscribe({
      next: () => {
        this.pwdSuccessMsg = 'Password changed successfully.';
        this.ui.showToast('Password changed successfully.');
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404 || err.status === 400) {
          this.oldPasswordErrVisible = true;
        }
        this.pwdErrorMsg = err.error?.message || 'Could not change password. Please try again.';
      }
    });
  }

  onPhotoSelected(event: Event): void {
    this.photoErrorMsg = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.photoErrorMsg = 'Please choose an image file.';
      input.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.photoErrorMsg = 'Image must be 5MB or smaller.';
      input.value = '';
      return;
    }

    this.isUploadingPhoto = true;
    this.profileService.uploadPhoto(file).subscribe({
      next: () => {
        this.isUploadingPhoto = false;
        this.loadPhoto();
        this.ui.showToast('Profile photo updated successfully.');
        input.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.isUploadingPhoto = false;
        this.photoErrorMsg = err.error?.message || 'Could not upload photo. Please try again.';
        input.value = '';
      }
    });
  }

  logout(): void {
    this.ui.requestLogoutConfirm();
  }

  promptLogoutAllDevices(): void {
    this.logoutAllErrorMsg = '';
    this.logoutAllConfirmVisible = true;
  }

  cancelLogoutAllDevices(): void {
    this.logoutAllConfirmVisible = false;
  }

  // Reuses the existing POST /api/auth/logout-all-devices exactly as-is (AuthService.logoutAllDevices) —
  // no new backend endpoint. That call already revokes every refresh token for this user and, on
  // success, clears this browser's own local session too (AuthService.clearSession via its tap()).
  confirmLogoutAllDevices(): void {
    if (this.loggingOutAll) return;
    this.loggingOutAll = true;
    this.logoutAllErrorMsg = '';

    this.auth.logoutAllDevices().subscribe({
      next: () => {
        this.loggingOutAll = false;
        this.ui.showToast('You have been logged out from all devices.', () => this.router.navigate(['/auth/login']));
      },
      error: (err: HttpErrorResponse) => {
        this.loggingOutAll = false;
        this.logoutAllErrorMsg = err.error?.message || 'Could not log out from all devices. Please try again.';
      }
    });
  }
}
