import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import { HotelStateService } from '../../../core/services/hotel-state.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';

/** Port of features/User/Admin/profile.html + inline script. */
@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private state = inject(HotelStateService);
  private ui = inject(GlobalUiService);

  user: any = null;
  fullName = 'System Admin';
  initials = 'SA';
  email = '';
  phone = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  errorMessage = '';

  ngOnInit(): void {
    const userId = this.auth.userId;
    if (userId) {
      this.user = this.state.getUserById(userId);
    }
    if (this.user) {
      this.fullName = `${this.user.firstName || ''} ${this.user.lastName || ''}`.trim() || this.auth.userName || 'System Admin';
      this.email = this.user.email;
      this.phone = this.user.phone;
    } else {
      this.fullName = this.auth.userName || 'System Admin';
      this.email = this.auth.userEmail || '';
    }
    this.initials = this.fullName
      .split(' ')
      .filter(Boolean)
      .map(p => p[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || 'SA';
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') this.showCurrent = !this.showCurrent;
    if (field === 'new') this.showNew = !this.showNew;
    if (field === 'confirm') this.showConfirm = !this.showConfirm;
  }

  submitPasswordChange(): void {
    this.errorMessage = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'All fields are mandatory.';
      return;
    }

    if (this.user && this.user.password && this.currentPassword !== this.user.password) {
      this.ui.showToast('Current password is incorrect.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.ui.showToast('Passwords do not match.');
      return;
    }

    if (this.user) {
      const users = this.state.users;
      const idx = users.findIndex((u: any) => u.id === this.user.id);
      if (idx !== -1) {
        users[idx].password = this.newPassword;
        this.state.users = users;
      }
    }

    this.ui.showToast('Profile Security credentials updated successfully.');
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
