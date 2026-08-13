import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'hotels',
    loadComponent: () => import('./features/hotels/search-results/search-results').then((m) => m.SearchResults),
  },
  {
    path: 'hotels/:id',
    loadComponent: () => import('./features/hotels/hotel-details/hotel-details').then((m) => m.HotelDetails),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'sessions',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/sessions/sessions').then((m) => m.Sessions),
  },
  { path: '**', redirectTo: '' },
];
