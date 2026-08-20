import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

const AUTH_FREE_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/auth/resend-verification'];

function isAuthFreeRequest(url: string): boolean {
  return AUTH_FREE_PATHS.some(p => url.includes(p));
}

// Interceptor Pattern — injects the auth token into every outgoing Admin/Customer API call.
/**
 * Attaches the bearer access token to every API request and transparently retries once
 * after a silent token refresh on 401, matching the backend's 1-day access / 7-day refresh setup.
 */
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);

  const token = tokenStorage.getAccessToken();
  const authReq = token && !isAuthFreeRequest(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthFreeRequest(req.url) && tokenStorage.getRefreshToken()) {
        return handle401(authReq, next, authService);
      }
      return throwError(() => err);
    })
  );
}

function handle401(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshedToken$.next(null);

    return authService.refresh().pipe(
      switchMap(res => {
        isRefreshing = false;
        refreshedToken$.next(res.data.token);
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.data.token}` } }));
      }),
      catchError(refreshErr => {
        isRefreshing = false;
        authService.clearSession();
        return throwError(() => refreshErr);
      })
    );
  }

  return refreshedToken$.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })))
  );
}
