import { Routes } from '@angular/router';

/**
 * Manager dashboard routes. Consumed by the orchestrator's app.routes.ts,
 * likely mounted under a `/manager` prefix. All components are standalone
 * and lazy-loaded.
 */
export const MANAGER_ROUTES: Routes = [
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'bookings', loadComponent: () => import('./bookings/bookings.component').then(m => m.BookingsComponent) },
  { path: 'booking-calendar', loadComponent: () => import('./booking-calendar/booking-calendar.component').then(m => m.BookingCalendarComponent) },
  { path: 'booking-history', loadComponent: () => import('./booking-history/booking-history.component').then(m => m.BookingHistoryComponent) },
  { path: 'check-in', loadComponent: () => import('./check-in/check-in.component').then(m => m.CheckInComponent) },
  { path: 'check-out', loadComponent: () => import('./check-out/check-out.component').then(m => m.CheckOutComponent) },
  { path: 'guests', loadComponent: () => import('./guests/guests.component').then(m => m.GuestsComponent) },
  { path: 'housekeeping', loadComponent: () => import('./housekeeping/housekeeping.component').then(m => m.HousekeepingComponent) },
  { path: 'notifications', loadComponent: () => import('./notifications/notifications.component').then(m => m.NotificationsComponent) },
  { path: 'reviews', loadComponent: () => import('./reviews/reviews.component').then(m => m.ReviewsComponent) },
  { path: 'reports/bookings', loadComponent: () => import('./reports/reports-bookings.component').then(m => m.ReportsBookingsComponent) },
  { path: 'reports/occupancy', loadComponent: () => import('./reports/reports-occupancy.component').then(m => m.ReportsOccupancyComponent) },
  { path: 'reports/payments', loadComponent: () => import('./reports/reports-payments.component').then(m => m.ReportsPaymentsComponent) },
  { path: 'reports/profile', loadComponent: () => import('./reports/reports-profile.component').then(m => m.ReportsProfileComponent) },
  { path: 'rooms', loadComponent: () => import('./rooms/rooms.component').then(m => m.RoomsComponent) },
  { path: 'rooms/availability', loadComponent: () => import('./rooms/room-availability.component').then(m => m.RoomAvailabilityComponent) },
  { path: 'rooms/types', loadComponent: () => import('./rooms/room-types.component').then(m => m.RoomTypesComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];
