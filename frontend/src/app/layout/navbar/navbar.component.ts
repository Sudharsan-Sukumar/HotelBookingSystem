import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GlobalUiService } from '../../core/services/global-ui.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  userName = '';
  userRole = '';
  userEmail = '';
  dropdownOpen = false;
  photoUrl: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    public ui: GlobalUiService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn;
    this.userName = this.auth.userName || '';
    this.userRole = this.auth.userRole || '';
    this.userEmail = this.auth.userEmail || '';

    if (this.isLoggedIn) {
      this.profileService.getOwnProfile().subscribe({
        next: (res) => {
          if (res.data?.profilePhotoUrl) {
            this.profileService.getPhotoBlob().subscribe({
              next: (blob) => {
                this.photoUrl = URL.createObjectURL(blob);
                // Without this, the fetched photo sits ready in memory but the navbar (embedded
                // inside every page's layout) never repaints on its own — it only appeared once
                // some unrelated click (e.g. opening the dropdown) happened to trigger a global
                // change-detection tick.
                this.cdr.markForCheck();
              },
              error: () => { /* no photo yet — keep default gold placeholder */ }
            });
          }
        },
        error: () => { /* keep default gold placeholder */ }
      });
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  guardedNav(path: string, event: Event): void {
    if (!this.isLoggedIn) {
      event.preventDefault();
      this.ui.showToast('Please login to continue.', () => this.router.navigate(['/auth/login']));
    }
  }

  profileLink(): string {
    if (this.userRole === 'Admin') return '/admin/profile';
    if (this.userRole === 'Manager') return '/manager/profile';
    return '/candidate/profile';
  }

  logout(): void {
    this.dropdownOpen = false;
    this.ui.requestLogoutConfirm();
  }
}
