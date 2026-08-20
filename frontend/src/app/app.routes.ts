import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard, managerGuard, customerGuard } from './core/guards/role.guard';
import { UnauthorizedComponent } from './shared/pages/unauthorized/unauthorized.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  { path: 'hotels', loadChildren: () => import('./features/hotels/hotels.routes').then(m => m.HOTELS_ROUTES) },
  { path: 'bookings', canActivate: [authGuard], loadChildren: () => import('./features/bookings/bookings.routes').then(m => m.BOOKINGS_ROUTES) },
  { path: 'candidate', canActivate: [customerGuard], loadChildren: () => import('./features/candidate/candidate.routes').then(m => m.CANDIDATE_ROUTES) },
  { path: 'admin', canActivate: [adminGuard], loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  { path: 'manager', canActivate: [managerGuard], loadChildren: () => import('./features/manager/manager.routes').then(m => m.MANAGER_ROUTES) },
  { path: '**', redirectTo: '' }
];
