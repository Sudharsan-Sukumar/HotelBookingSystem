import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationDto } from '../../../core/models/notification.model';

type NotifCategory = 'booking' | 'payment' | 'promotion';

/** No SignalR/WebSocket/SSE exists in this backend — polling the existing GET /api/notifications/my
 * endpoint is the safest available mechanism to keep this list current without a manual page
 * refresh. See final report for this documented limitation. */
const NOTIFICATIONS_POLL_INTERVAL_MS = 30000;

interface DisplayNotification {
  id: number;
  title: string;
  message: string;
  category: NotifCategory;
  isRead: boolean;
  createdAt: string;
  timestamp: number;
  isToday: boolean;
  actionText: string;
}

/**
 * Real HTTP-backed version of the customer notifications page (Features/CMS/Controllers/
 * NotificationsController.cs). The backend `Notification` entity is `{Id, UserId, Message, Type,
 * IsRead, CreatedAt}` — there is NO separate `title` field, unlike the old mock. A short heading is
 * derived client-side from `type` (falls back to "Notification") so the existing card layout (which
 * expects a title + message) keeps working without changes to the template.
 *
 * Auth gate: unchanged — reads AuthService.isLoggedIn like before.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isLoading = false;
  loadError = '';

  private allNotifications: DisplayNotification[] = [];
  visibleNotifications: DisplayNotification[] = [];

  activeCategory: 'all' | NotifCategory = 'all';
  dateFilter: 'all' | 'today' = 'all';
  sortOrder: 'newest' | 'oldest' = 'newest';

  countAll = 0;
  countBookings = 0;
  countPayments = 0;
  countPromotions = 0;

  titleGroupLabel = 'All Notifications (0)';

  private pollTimer: any = null;

  constructor(private auth: AuthService, private notificationsService: NotificationsService) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn;
    if (!this.isLoggedIn) return;

    this.loadNotifications();
    this.pollTimer = setInterval(() => this.loadNotifications(true), NOTIFICATIONS_POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private categoryFor(type: string | undefined): NotifCategory {
    const t = (type || '').toLowerCase();
    if (t.includes('payment') || t.includes('refund')) return 'payment';
    if (t.includes('booking') || t.includes('modification') || t.includes('cancel')) return 'booking';
    return 'promotion';
  }

  private titleFor(type: string | undefined): string {
    if (!type) return 'Notification';
    // "BookingCancelled" -> "Booking Cancelled"
    return type.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  private actionTextFor(category: NotifCategory): string {
    if (category === 'booking') return 'View Booking';
    if (category === 'payment') return 'View Payment';
    return 'View Offer';
  }

  private loadNotifications(silent = false): void {
    if (!silent) this.isLoading = true;
    this.loadError = '';
    this.notificationsService.getMyNotifications().subscribe({
      next: (res) => {
        this.isLoading = false;
        const raw: NotificationDto[] = res.data || [];

        const today = new Date();
        const isSameDay = (d: Date) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

        this.allNotifications = raw.map((n) => {
          const created = new Date(n.createdAt);
          const category = this.categoryFor(n.type);
          return {
            id: n.id,
            title: this.titleFor(n.type),
            message: n.message,
            category,
            isRead: n.isRead,
            createdAt: n.createdAt,
            timestamp: isNaN(created.getTime()) ? 0 : created.getTime(),
            isToday: !isNaN(created.getTime()) && isSameDay(created),
            actionText: this.actionTextFor(category)
          };
        });

        this.recomputeCounts();
        this.applyFilters();
      },
      error: () => {
        this.isLoading = false;
        // Only surface an error banner for the initial load — a background poll failure should
        // stay silent rather than disrupt the page with a transient-blip error message.
        if (!silent) this.loadError = 'Could not load your notifications right now.';
      }
    });
  }

  private recomputeCounts(): void {
    this.countAll = this.allNotifications.length;
    this.countBookings = this.allNotifications.filter(n => n.category === 'booking').length;
    this.countPayments = this.allNotifications.filter(n => n.category === 'payment').length;
    this.countPromotions = this.allNotifications.filter(n => n.category === 'promotion').length;
  }

  setCategory(category: 'all' | NotifCategory): void {
    this.activeCategory = category;
    this.applyFilters();
  }

  applyFilters(): void {
    let list = this.allNotifications.filter(n => {
      const matchesCat = this.activeCategory === 'all' || n.category === this.activeCategory;
      const matchesDate = this.dateFilter === 'all' || (this.dateFilter === 'today' && n.isToday);
      return matchesCat && matchesDate;
    });

    list = list.sort((a, b) => this.sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

    this.visibleNotifications = list;

    const labels: Record<string, string> = {
      all: 'All Notifications', booking: 'Bookings', payment: 'Payments', promotion: 'Promotions'
    };
    this.titleGroupLabel = `${labels[this.activeCategory]} (${list.length})`;
  }

  resetFilters(): void {
    this.activeCategory = 'all';
    this.dateFilter = 'all';
    this.sortOrder = 'newest';
    this.applyFilters();
  }

  markAllRead(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.allNotifications.forEach(n => n.isRead = true);
        this.applyFilters();
      }
    });
  }

  markOneRead(notifId: number): void {
    this.notificationsService.markAsRead(notifId).subscribe({
      next: () => {
        const local = this.allNotifications.find(n => n.id === notifId);
        if (local) local.isRead = true;
        this.applyFilters();
      }
    });
  }
}
