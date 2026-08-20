import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { HotelStateService } from '../../../core/services/hotel-state.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

/** Matches Features/CMS/DTOs/NotificationRequestDto.cs. UserId null/omitted = broadcast to all. */
interface NotificationRequestDto {
  userId: number | null;
  message: string;
  type: string;
}

interface NotifView {
  id: string;
  module: string;
  title: string;
  desc: string;
  date: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  status: 'Read' | 'Unread';
  recommendation: string;
}

const PRIORITY_BY_TYPE: Record<string, NotifView['priority']> = {
  BookingConfirmed: 'Medium',
  BookingCancelled: 'Medium',
  System: 'Info',
  Security: 'Critical',
  Backup: 'Low'
};

/**
 * Port of features/User/Admin/notifications.html + notifications.js.
 * Backed by HotelStateService.notifications (the shared app-wide notification
 * store: {id, recipientId, recipientRole, type, title, message, isRead,
 * createdAt, relatedId}) rather than the original's standalone
 * HotelState.adminNotifications mock array — the fields below adapt to it.
 */
@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  private state = inject(HotelStateService);
  private ui = inject(GlobalUiService);
  private http = inject(HttpClient);
  private readonly broadcastUrl = `${environment.apiUrl}/Notifications`;

  raw: any[] = [];
  searchQuery = '';
  activeCategory = 'All';
  selected: NotifView | null = null;

  categories = ['All', 'BookingConfirmed', 'BookingCancelled', 'System', 'Security', 'Backup'];

  // Compose broadcast notification (real HTTP call to POST /api/notifications)
  showComposeModal = false;
  composeUserId: number | null = null;
  composeMessage = '';
  composeType: 'Info' | 'Alert' | 'Warning' = 'Info';
  composeError = '';
  isSending = false;

  ngOnInit(): void {
    this.raw = this.state.notifications || [];
    this.selected = null;
  }

  openComposeModal(): void {
    this.composeUserId = null;
    this.composeMessage = '';
    this.composeType = 'Info';
    this.composeError = '';
    this.showComposeModal = true;
  }

  cancelCompose(): void {
    this.showComposeModal = false;
  }

  sendBroadcast(): void {
    this.composeError = '';
    const message = this.composeMessage.trim();
    if (!message) {
      this.composeError = 'Message is required.';
      return;
    }

    const dto: NotificationRequestDto = {
      userId: this.composeUserId,
      message,
      type: this.composeType
    };

    this.isSending = true;
    this.http.post<ApiResponse<null>>(this.broadcastUrl, dto).subscribe({
      next: res => {
        this.isSending = false;
        this.showComposeModal = false;
        this.ui.showToast(res.message || 'Notification queued for delivery.');
      },
      error: err => {
        this.isSending = false;
        this.composeError = err?.error?.errors?.[0] || err?.error?.message || 'Failed to send notification.';
      }
    });
  }

  private toView(n: any): NotifView {
    const priority = PRIORITY_BY_TYPE[n.type] || 'Info';
    return {
      id: n.id,
      module: n.type || 'System',
      title: n.title,
      desc: n.message,
      date: n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' IST' : '',
      priority,
      status: n.isRead ? 'Read' : 'Unread',
      recommendation: this.recommendationFor(n.type)
    };
  }

  private recommendationFor(type: string): string {
    switch (type) {
      case 'Security': return 'Investigate immediately and lock the account if suspicious activity continues.';
      case 'BookingCancelled': return 'Check refund trigger logs and update room availability status.';
      case 'BookingConfirmed': return 'No further action required; booking is confirmed.';
      case 'Backup': return 'No further actions required.';
      default: return 'Review and take action as appropriate.';
    }
  }

  get views(): NotifView[] {
    return this.raw.map(n => this.toView(n));
  }

  get filtered(): NotifView[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.views.filter(n => {
      if (this.activeCategory !== 'All' && n.module !== this.activeCategory) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.desc.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  get unreadCount(): number {
    return this.raw.filter(n => !n.isRead).length;
  }

  get criticalCount(): number {
    return this.views.filter(n => n.priority === 'Critical' && n.status === 'Unread').length;
  }

  get todayCount(): number {
    const todayStr = new Date().toDateString();
    return this.raw.filter(n => n.createdAt && new Date(n.createdAt).toDateString() === todayStr).length;
  }

  get resolvedTodayCount(): number {
    const todayStr = new Date().toDateString();
    return this.raw.filter(n => n.isRead && n.createdAt && new Date(n.createdAt).toDateString() === todayStr).length;
  }

  categoryCount(cat: string): number {
    if (cat === 'All') return this.raw.length;
    return this.raw.filter(n => n.type === cat).length;
  }

  setCategory(cat: string): void {
    this.activeCategory = cat;
  }

  viewDetails(id: string): void {
    const v = this.views.find(n => n.id === id);
    if (v) this.selected = v;
  }

  markAllRead(): void {
    this.raw.forEach(n => (n.isRead = true));
    this.state.notifications = this.raw;
    this.ui.showToast('All notifications marked as read.');
  }

  clearRead(): void {
    this.raw = this.raw.filter(n => !n.isRead);
    this.state.notifications = this.raw;
    this.selected = null;
    this.ui.showToast('Read notifications cleared.');
  }

  markSelectedRead(): void {
    if (!this.selected) return;
    const n = this.raw.find(x => x.id === this.selected!.id);
    if (n) {
      n.isRead = true;
      this.state.notifications = this.raw;
      this.selected = this.toView(n);
      this.ui.showToast('Notification marked as read.');
    }
  }

  deleteSelected(): void {
    if (!this.selected) return;
    this.raw = this.raw.filter(n => n.id !== this.selected!.id);
    this.state.notifications = this.raw;
    this.selected = null;
    this.ui.showToast('Notification deleted.');
  }

  priorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'Critical': return 'bg-danger';
      case 'High': return 'bg-warning text-dark';
      case 'Medium': return 'bg-info text-dark';
      case 'Low': return 'bg-success';
      default: return 'bg-primary';
    }
  }

  borderClass(priority: string): string {
    switch (priority) {
      case 'Critical': return 'notif-critical';
      case 'High': return 'notif-high';
      case 'Medium': return 'notif-medium';
      case 'Low': return 'notif-low';
      default: return 'notif-info';
    }
  }
}
