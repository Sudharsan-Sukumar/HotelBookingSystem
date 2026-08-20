import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

// Factory Pattern — produces a configured CanActivateFn per role instead of one guard per role.
/** Factory for a per-role guard — e.g. `roleGuard('Admin')` on the admin route group. */
export function roleGuard(...allowedRoles: UserRole[]): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn) {
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }

    const role = auth.userRole;
    if (role && allowedRoles.includes(role)) return true;

    return router.createUrlTree(['/unauthorized']);
  };
}

// Guard Pattern — restricts the Admin module's route tree to the Admin role only.
export const adminGuard = roleGuard('Admin');
export const managerGuard = roleGuard('Manager');
// Guard Pattern — restricts Customer-only routes (e.g. /candidate) to the Customer role.
export const customerGuard = roleGuard('Customer');
