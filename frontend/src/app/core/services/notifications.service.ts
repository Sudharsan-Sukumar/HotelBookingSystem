import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { NotificationDto } from '../models/notification.model';

/** Real HTTP client for Features/CMS/Controllers/NotificationsController.cs (any authenticated role). */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<ApiResponse<NotificationDto[]>> {
    return this.http.get<ApiResponse<NotificationDto[]>>(`${this.base}/my`);
  }

  markAsRead(id: number): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.base}/${id}/read`, {});
  }

  markAllAsRead(): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.base}/read-all`, {});
  }

  deleteNotification(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }
}
