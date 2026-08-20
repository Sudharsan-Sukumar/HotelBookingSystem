import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GlobalUiService } from '../../core/services/global-ui.service';
import { NotificationsService } from '../../core/services/notifications.service';

/** No SignalR/WebSocket/SSE exists in this backend — polling the existing
 * GET /api/notifications/my endpoint is the safest available mechanism to keep this badge
 * current without a manual page refresh. See final report for this documented limitation. */
const UNREAD_POLL_INTERVAL_MS = 30000;

/**
 * Manager chrome top nav — ported from the real <nav> markup found in
 * Manager/dashboard.html, bookings.html and rooms.html (NOT the generic
 * nav_template.html labels). Self-contained; does not reuse the
 * customer-facing navbar or the admin top-nav.
 */
@Component({
  selector: 'app-manager-top-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  styleUrl: './manager-top-nav.component.scss',
  template: `
    <nav class="navbar navbar-expand-md manager-top-nav py-2 sticky-top">
      <div class="container-fluid px-4 d-flex align-items-center flex-nowrap">
        <a class="navbar-brand d-flex align-items-center gap-2 me-3" routerLink="/manager/dashboard" style="flex-shrink:0;">
          <img src="/assets/images/logo.png" alt="Elegant Enclave" style="height:42px;width:auto;object-fit:contain;border-radius:50%;border:1.5px solid #D4AF37;margin-right:12px;">
          <span class="brand-text text-white font-serif fw-bold fs-4">Elegant<span>Enclave</span></span>
        </a>

        <div class="d-flex align-items-center justify-content-between flex-grow-1 flex-wrap gap-2">
          <ul class="navbar-nav ms-xl-4 gap-1 flex-row flex-nowrap">
            <li class="nav-item">
              <a class="nav-link" routerLink="/manager/dashboard" routerLinkActive="active">
                <i class="bi bi-grid-fill me-1"></i> Dashboard
              </a>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-calendar-check-fill me-1"></i> Bookings
              </a>
              <ul class="dropdown-menu shadow border">
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/bookings">All Bookings</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/check-in">Check-in</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/check-out">Check-out</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/booking-calendar">Booking Calendar</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/booking-history">Booking History</a></li>
              </ul>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-building-fill me-1"></i> Rooms
              </a>
              <ul class="dropdown-menu shadow border">
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/rooms">Room Management</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/rooms/types">Room Types</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/rooms/availability">Room Availability</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/housekeeping">Housekeeping</a></li>
              </ul>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/manager/guests" routerLinkActive="active">
                <i class="bi bi-people-fill me-1"></i> Guests
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/manager/reviews" routerLinkActive="active">
                <i class="bi bi-star-fill me-1"></i> Reviews
              </a>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-bar-chart-line-fill me-1"></i> Reports
              </a>
              <ul class="dropdown-menu shadow border">
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/reports/occupancy">Occupancy Report</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/reports/bookings">Booking Report</a></li>
                <li><a class="dropdown-item text-white small py-2" routerLink="/manager/reports/payments">Payment Report</a></li>
              </ul>
            </li>
          </ul>

          <div class="d-flex align-items-center flex-wrap gap-2">
            <a routerLink="/manager/notifications" class="btn notification-bell-btn position-relative text-white p-2">
              <i class="bi bi-bell-fill text-warning"></i>
              @if (unreadCount() > 0) {
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size:0.6rem;">{{ unreadCount() }}</span>
              }
            </a>
            <div class="dropdown border-start border-secondary border-opacity-50 ps-2">
              <button class="btn dropdown-toggle d-flex align-items-center gap-2 p-0 text-white border-0" type="button" data-bs-toggle="dropdown" style="background:transparent!important;">
                <div class="profile-avatar-circle">{{ initials() }}</div>
                <div class="lh-sm text-start text-white d-none d-lg-block">
                  <strong class="d-block small" style="font-size:0.75rem;">{{ firstName() }}</strong>
                </div>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow border border-warning">
                <li><a class="dropdown-item py-2 px-3 text-white d-flex align-items-center gap-2" routerLink="/manager/reports/profile" style="font-size:0.85rem;"><i class="bi bi-person-fill text-warning"></i> View Profile</a></li>
                <li><hr class="dropdown-divider bg-secondary opacity-25"></li>
                <li><a class="dropdown-item py-2 px-3 text-danger d-flex align-items-center gap-2" href="#" (click)="onLogout($event)" style="font-size:0.85rem;"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class ManagerTopNavComponent implements OnInit, OnDestroy {
  private readonly userName = signal('Manager');
  readonly unreadCount = signal(0);

  readonly firstName = computed(() => this.userName().split(' ')[0] || 'Manager');
  readonly initials = computed(() => {
    const parts = this.userName().split(' ');
    return (parts[0]?.[0] || 'M') + (parts[1]?.[0] || '');
  });

  private pollTimer: any = null;

  constructor(
    private auth: AuthService,
    private globalUi: GlobalUiService,
    private notificationsService: NotificationsService
  ) {
    this.userName.set(this.auth.userName || 'Manager');
  }

  ngOnInit(): void {
    this.refreshUnreadCount();
    this.pollTimer = setInterval(() => this.refreshUnreadCount(), UNREAD_POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private refreshUnreadCount(): void {
    this.notificationsService.getMyNotifications().subscribe({
      next: (res) => this.unreadCount.set((res.data || []).filter(n => !n.isRead).length),
      error: () => { /* keep last known count on a transient failure */ }
    });
  }

  onLogout(event: Event): void {
    event.preventDefault();
    this.globalUi.requestLogoutConfirm();
  }
}
