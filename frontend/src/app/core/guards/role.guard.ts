import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

// Usage: { path: 'admin', canActivate: [authGuard, roleGuard], data: { roles: ['Admin'] } }
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as UserRole[] | undefined;
  const role = auth.role();

  if (allowedRoles && role && allowedRoles.includes(role)) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
