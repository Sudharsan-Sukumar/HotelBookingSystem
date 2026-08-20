import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard Pattern — gatekeeps Customer module routes (e.g. /bookings) until a valid session exists.
/** Blocks any route it's applied to unless a real (JWT-backed) session exists. */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) return true;

  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
