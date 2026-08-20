import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },

  { path: 'users', loadComponent: () => import('./users/users-list.component').then(m => m.UsersListComponent) },
  { path: 'users/add', loadComponent: () => import('./users/add-user.component').then(m => m.AddUserComponent) },
  { path: 'users/approvals', loadComponent: () => import('./users/manager-approvals.component').then(m => m.ManagerApprovalsComponent) },
  { path: 'users/:id', loadComponent: () => import('./users/view-user.component').then(m => m.ViewUserComponent) },

  { path: 'hotels', loadComponent: () => import('./hotels/hotels-list.component').then(m => m.HotelsListComponent) },
  { path: 'hotels/add', loadComponent: () => import('./hotels/add-hotel.component').then(m => m.AddHotelComponent) },
  { path: 'hotels/room-types', loadComponent: () => import('./hotels/room-types.component').then(m => m.RoomTypesComponent) },
  { path: 'hotels/:id/edit', loadComponent: () => import('./hotels/edit-hotel.component').then(m => m.EditHotelComponent) },
  { path: 'hotels/:id', loadComponent: () => import('./hotels/view-hotel.component').then(m => m.ViewHotelComponent) },

  // Hero/About/Contact are now edited inline in the Content Management split-screen
  // (see ContentComponent) rather than as separate routes, so the live preview beside them can
  // reflect edits immediately without navigating away.
  { path: 'content', loadComponent: () => import('./content/content.component').then(m => m.ContentComponent) },
  { path: 'content/layout', loadComponent: () => import('./content/edit-layout.component').then(m => m.EditLayoutComponent) },
  { path: 'content/manager/:id', loadComponent: () => import('./content/edit-manager.component').then(m => m.EditManagerComponent) },
  { path: 'content/help-articles', loadComponent: () => import('./content/help-articles.component').then(m => m.HelpArticlesComponent) },
  { path: 'content/promotions', loadComponent: () => import('./content/promotions.component').then(m => m.PromotionsComponent) },
  { path: 'content/policies', loadComponent: () => import('./content/policy-management.component').then(m => m.PolicyManagementComponent) },

  { path: 'settings', loadComponent: () => import('./settings/system-settings.component').then(m => m.SystemSettingsComponent) },

  { path: 'backup', loadComponent: () => import('./backup/backup.component').then(m => m.BackupComponent) },

  { path: 'monitoring', loadComponent: () => import('./monitoring/booking-monitoring.component').then(m => m.BookingMonitoringComponent) },
  { path: 'monitoring/transactions', loadComponent: () => import('./monitoring/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'monitoring/:bookingId', loadComponent: () => import('./monitoring/view-booking.component').then(m => m.ViewBookingComponent) },

  { path: 'reports', loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent) },
  { path: 'reports/booking-analytics', loadComponent: () => import('./reports/booking-analytics.component').then(m => m.BookingAnalyticsComponent) },
  { path: 'reports/hotel-performance', loadComponent: () => import('./reports/hotel-performance.component').then(m => m.HotelPerformanceComponent) },
  { path: 'reports/user-analytics', loadComponent: () => import('./reports/user-analytics.component').then(m => m.UserAnalyticsComponent) },

  { path: 'reviews', loadComponent: () => import('./reviews/reviews.component').then(m => m.ReviewsComponent) },

  { path: 'audit', loadComponent: () => import('./audit/audit-log.component').then(m => m.AuditLogComponent) },

  { path: 'notifications', loadComponent: () => import('./notifications/notifications.component').then(m => m.NotificationsComponent) },
  { path: 'profile', loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent) },
];
