import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { NotificationDto } from '../../../core/models/manager.model';

/** Wired to GET api/notifications/my, PUT .../read, PUT .../read-all, DELETE .../{id}.
 *  The real entity has no "title" field — only "message" — so the template renders message
 *  as the main line, type as a small badge, and createdAt as the timestamp. */
@Component({
  selector: 'app-manager-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Notifications</li>
        </ol>
      </nav>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="font-serif fw-bold text-purple h2 mb-0">Notifications</h1>
        <button class="btn btn-outline-purple btn-sm" (click)="markAllRead()">Mark all as read</button>
      </div>

      @if (loading()) {
        <p class="text-muted">Loading notifications...</p>
      } @else {
        <div class="list-group">
          @for (n of notifications(); track n.id) {
            <div class="list-group-item d-flex justify-content-between align-items-start"
                 [class.bg-light]="!n.isRead" [class.border-start]="!n.isRead" [class.border-4]="!n.isRead" [class.border-primary]="!n.isRead">
              <div>
                <span class="badge bg-secondary me-2">{{ n.type }}</span>
                <span>{{ n.message }}</span>
                <span class="d-block text-muted" style="font-size:0.7rem;">{{ n.createdAt | date:'medium' }} IST</span>
              </div>
              <div class="d-flex gap-2">
                @if (!n.isRead) {
                  <button class="btn btn-sm btn-outline-secondary" (click)="markRead(n)">Mark read</button>
                }
                <button class="btn btn-sm btn-outline-danger" (click)="deleteNotification(n)">Delete</button>
              </div>
            </div>
          } @empty {
            <div class="list-group-item text-center text-muted py-5">No notifications.</div>
          }
        </div>
      }
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  private readonly base = environment.apiUrl;

  readonly loading = signal(true);
  readonly notifications = signal<NotificationDto[]>([]);

  constructor(private http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<NotificationDto[]>>(`${this.base}/notifications/my`)
      );
      this.notifications.set(res.data ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  async markRead(n: NotificationDto): Promise<void> {
    try {
      await firstValueFrom(this.http.put<ApiResponse<null>>(`${this.base}/notifications/${n.id}/read`, {}));
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    } catch {
      // interceptor surfaces the error toast
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await firstValueFrom(this.http.put<ApiResponse<null>>(`${this.base}/notifications/read-all`, {}));
      this.notifications.update(list => list.map(x => ({ ...x, isRead: true })));
    } catch {
      // interceptor surfaces the error toast
    }
  }

  async deleteNotification(n: NotificationDto): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<ApiResponse<null>>(`${this.base}/notifications/${n.id}`));
      this.notifications.update(list => list.filter(x => x.id !== n.id));
    } catch {
      // interceptor surfaces the error toast
    }
  }
}
