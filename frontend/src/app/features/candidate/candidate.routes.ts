import { Routes } from '@angular/router';

export const CANDIDATE_ROUTES: Routes = [
  { path: 'my-bookings', loadComponent: () => import('./my-bookings/my-bookings.component').then(m => m.MyBookingsComponent) },
  { path: 'profile', loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent) },
  { path: 'transactions', loadComponent: () => import('./transactions/transactions.component').then(m => m.TransactionsComponent) },
];
