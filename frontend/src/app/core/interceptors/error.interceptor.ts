import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { GlobalUiService } from '../services/global-ui.service';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { RenderTickService } from '../services/render-tick.service';

/** Extracts a friendly message from the backend's ApiResponse envelope without leaking raw stack traces. */
function extractMessage(err: HttpErrorResponse): string {
  const body = err.error;
  if (body && typeof body === 'object') {
    if (Array.isArray(body.errors) && body.errors.length) return body.errors.join(' ');
    if (typeof body.message === 'string' && body.message) return body.message;
  }
  switch (err.status) {
    case 0: return 'Unable to reach the server. Please check your connection.';
    case 400: return 'The request could not be processed. Please check the form and try again.';
    case 401: return 'Your session has expired. Please log in again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 409: return 'This record was changed by someone else. Please refresh and try again.';
    case 422: return 'Some fields are invalid. Please review and try again.';
    case 423: return 'Account temporarily locked due to repeated failed login attempts. Try again later.';
    case 429: return 'Too many requests. Please slow down and try again shortly.';
    case 500: return 'Something went wrong on our end. Please try again later.';
    default: return 'An unexpected error occurred.';
  }
}

// Interceptor Pattern — centralizes error handling for every Admin/Customer HTTP call in one place.
/** Central place that turns backend error responses into the existing APK-style toast, without touching UI markup. */
export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const ui = inject(GlobalUiService);
  const auth = inject(AuthService);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);
  const renderTick = inject(RenderTickService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const message = extractMessage(err);

        if (err.status === 401) {
          // If there's already no session (e.g. a duplicate/racing request — such as a second
          // click on "Logout" before the first request's response came back — settles with a 401
          // AFTER the first request already succeeded and cleared the session), this failure is
          // stale/redundant noise, not a real "your session expired" event. Showing the toast and
          // redirecting anyway would confusingly bounce an already-successfully-logged-out user to
          // the login page with a misleading message.
          const hadActiveSession = !!tokenStorage.getAccessToken();
          auth.clearSession();
          if (hadActiveSession) {
            ui.showToast(message, () => router.navigate(['/auth/login']));
          }
        } else if (err.status !== 400 && err.status !== 422 && err.status !== 409) {
          // 400/422/409 are typically handled inline by the calling form/component;
          // everything else surfaces as a toast so no error is silently swallowed.
          ui.showToast(message);
        }

        return throwError(() => ({ ...err, friendlyMessage: message }));
      }
      return throwError(() => err);
    }),
    // See RenderTickService — forces the routed component to re-render after every API call,
    // working around this environment's async-mutation-doesn't-repaint issue centrally, once,
    // instead of requiring every component to inject ChangeDetectorRef itself.
    finalize(() => renderTick.requestTick())
  );
}
