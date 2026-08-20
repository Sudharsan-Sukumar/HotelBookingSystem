import { Routes } from '@angular/router';

export const BOOKINGS_ROUTES: Routes = [
  { path: 'room-selection', loadComponent: () => import('./room-selection/room-selection.component').then(m => m.RoomSelectionComponent) },
  { path: 'guest-details', loadComponent: () => import('./guest-details/guest-details.component').then(m => m.GuestDetailsComponent) },
  { path: 'invoice-summary', loadComponent: () => import('./invoice-summary/invoice-summary.component').then(m => m.InvoiceSummaryComponent) },
  { path: 'payment-portal', loadComponent: () => import('./payment-portal/payment-portal.component').then(m => m.PaymentPortalComponent) },
  { path: 'success', loadComponent: () => import('./booking-success/booking-success.component').then(m => m.BookingSuccessComponent) },
  { path: 'notifications', loadComponent: () => import('./notifications/notifications.component').then(m => m.NotificationsComponent) },
  { path: 'modify/:bookingId/step1', loadComponent: () => import('./modify-step1/modify-step1.component').then(m => m.ModifyStep1Component) },
  { path: 'modify/:bookingId/step2', loadComponent: () => import('./modify-step2/modify-step2.component').then(m => m.ModifyStep2Component) },
  { path: 'modify/:bookingId/step3', loadComponent: () => import('./modify-step3/modify-step3.component').then(m => m.ModifyStep3Component) },
];
