import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GlobalUiService } from '../../core/services/global-ui.service';

const SIDEBAR_STATE_KEY = 'adminSidebarState';

interface AdminNavLink {
  path: string;
  icon: string;
  label: string;
}

/**
 * Shared left sidebar chrome for every admin page.
 * Ported from features/User/Admin/components/admin-sidebar.html (+ .js/.css).
 * Named admin-top-nav per project convention, but renders the dark left
 * sidebar nav that is the actual admin chrome pattern (see admin.css's
 * `.manager-top-nav` which is a separate/legacy top-nav variant not used here).
 */
@Component({
  selector: 'app-admin-top-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-top-nav.component.html',
  styleUrls: ['./admin-top-nav.component.scss']
})
export class AdminTopNavComponent implements OnInit {
  readonly navLinks: AdminNavLink[] = [
    { path: '/admin/dashboard', icon: 'bi-grid-fill', label: 'Dashboard' },
    { path: '/admin/users', icon: 'bi-people-fill', label: 'Users' },
    { path: '/admin/hotels', icon: 'bi-building-fill', label: 'Hotels' },
    { path: '/admin/hotels/room-types', icon: 'bi-door-open-fill', label: 'Room Types' },
    { path: '/admin/content', icon: 'bi-file-text', label: 'Content Management' },
    { path: '/admin/backup', icon: 'bi-database-fill-gear', label: 'Backup & Recovery' },
    { path: '/admin/monitoring', icon: 'bi-calendar-check-fill', label: 'Booking Monitoring' },
    { path: '/admin/monitoring/transactions', icon: 'bi-credit-card-2-front-fill', label: 'Payments & Refunds' },
    { path: '/admin/reviews', icon: 'bi-chat-square-text-fill', label: 'Review Moderation' },
    { path: '/admin/audit', icon: 'bi-journal-text', label: 'Audit Log' },
    { path: '/admin/reports', icon: 'bi-bar-chart-line-fill', label: 'Reports' },
    { path: '/admin/notifications', icon: 'bi-bell-fill', label: 'Notifications' }
  ];

  userName = 'System Admin';
  userRole = 'System Administrator';
  userInitials = 'SA';

  collapsed = false;
  mobileOpen = false;

  constructor(private auth: AuthService, public ui: GlobalUiService) {}

  ngOnInit(): void {
    const name = this.auth.userName;
    if (name) {
      this.userName = name;
      this.userInitials = name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0]?.toUpperCase())
        .slice(0, 2)
        .join('') || 'SA';
    }
    this.userRole = this.auth.userRole === 'Admin' ? 'System Administrator' : (this.auth.userRole || 'System Administrator');

    const isMobile = window.innerWidth < 992;
    if (!isMobile) {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY) || 'collapsed';
      this.collapsed = savedState === 'collapsed';
    } else {
      this.collapsed = true;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    // Keep collapsed defaults sensible if the viewport crosses the breakpoint.
    if (window.innerWidth < 992) {
      this.mobileOpen = false;
    }
  }

  toggleSidebar(): void {
    const isMobile = window.innerWidth < 992;
    if (isMobile) {
      this.mobileOpen = !this.mobileOpen;
    } else {
      this.collapsed = !this.collapsed;
      localStorage.setItem(SIDEBAR_STATE_KEY, this.collapsed ? 'collapsed' : 'expanded');
    }
  }

  closeMobileSidebar(): void {
    this.mobileOpen = false;
  }

  onNavLinkClick(): void {
    const isMobile = window.innerWidth < 992;
    if (isMobile) {
      this.mobileOpen = false;
    } else {
      localStorage.setItem(SIDEBAR_STATE_KEY, 'collapsed');
    }
  }

  onLogoutClick(event: Event): void {
    event.preventDefault();
    this.ui.requestLogoutConfirm();
  }
}
