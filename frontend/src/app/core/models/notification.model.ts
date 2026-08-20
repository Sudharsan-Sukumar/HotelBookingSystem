/** Mirrors Features/CMS/Models/Notification.cs exactly — no separate `title` field exists server-side. */
export interface NotificationDto {
  id: number;
  userId: number;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
