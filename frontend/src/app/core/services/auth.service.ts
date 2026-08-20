import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponseDto, ForgotPasswordDto, LoginDto, LogoutDto,
  RefreshTokenDto, RegisterDto, ResendVerificationDto, ResetPasswordDto,
  UserRole, VerifyEmailDto
} from '../models/auth.model';
import { ApiResponse } from '../models/api-response.model';
import { StoredUser, TokenStorageService } from './token-storage.service';

/**
 * Real JWT-based auth against the Phase 3 backend (api/auth/*).
 *
 * Public getters (isLoggedIn/userName/userRole/userEmail/userId) are kept as PLAIN properties
 * (not signals) on purpose — ~30 already-built components across every feature area read them
 * as `auth.isLoggedIn`/`auth.userRole` etc. without calling them as functions. Changing this shape
 * would require touching every one of those files. They still reflect live state because each
 * getter re-reads from TokenStorageService on every access.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) {}

  get isLoggedIn(): boolean {
    return !!this.tokenStorage.getAccessToken() && !!this.tokenStorage.getUser();
  }

  get currentUser(): StoredUser | null {
    return this.tokenStorage.getUser();
  }

  get userName(): string {
    const u = this.tokenStorage.getUser();
    return u ? `${u.firstName} ${u.lastName}`.trim() : '';
  }

  get userRole(): UserRole | null {
    return this.tokenStorage.getUser()?.role ?? null;
  }

  get userEmail(): string {
    return this.tokenStorage.getUser()?.email ?? '';
  }

  get userId(): number | null {
    return this.tokenStorage.getUser()?.userId ?? null;
  }

  get forcePasswordChange(): boolean {
    return this.tokenStorage.getUser()?.forcePasswordChange ?? false;
  }

  login(dto: LoginDto): Observable<ApiResponse<AuthResponseDto>> {
    return this.http.post<ApiResponse<AuthResponseDto>>(`${this.base}/login`, dto).pipe(
      tap(res => this.applySession(res.data))
    );
  }

  /**
   * Google OAuth — idToken comes from Google Identity Services (see google-signin-button.component.ts),
   * never from a redirect/client-secret exchange this app would have to hold. The backend verifies it
   * against Google's own signing keys and returns the same app JWT/refresh-token pair as a normal
   * login, so everything downstream (interceptors, TokenStorageService) treats it identically.
   */
  googleLogin(idToken: string): Observable<ApiResponse<AuthResponseDto>> {
    return this.http.post<ApiResponse<AuthResponseDto>>(`${this.base}/google`, { idToken }).pipe(
      tap(res => this.applySession(res.data))
    );
  }

  register(dto: RegisterDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/register`, dto);
  }

  verifyEmail(dto: VerifyEmailDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/verify-email`, dto);
  }

  resendVerification(dto: ResendVerificationDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/resend-verification`, dto);
  }

  forgotPassword(dto: ForgotPasswordDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/forgot-password`, dto);
  }

  resetPassword(dto: ResetPasswordDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/reset-password`, dto);
  }

  refresh(): Observable<ApiResponse<AuthResponseDto>> {
    const dto: RefreshTokenDto = { refreshToken: this.tokenStorage.getRefreshToken() || '' };
    return this.http.post<ApiResponse<AuthResponseDto>>(`${this.base}/refresh`, dto).pipe(
      tap(res => this.tokenStorage.updateAccessToken(res.data.token, res.data.refreshToken))
    );
  }

  logout(): Observable<ApiResponse<null>> {
    const dto: LogoutDto = { refreshToken: this.tokenStorage.getRefreshToken() || undefined };
    return this.http.post<ApiResponse<null>>(`${this.base}/logout`, dto).pipe(
      tap(() => this.clearSession())
    );
  }

  logoutAllDevices(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/logout-all-devices`, {}).pipe(
      tap(() => this.clearSession())
    );
  }

  /** Clears local session state without calling the backend — used when a refresh fails/expires. */
  clearSession(): void {
    this.tokenStorage.clear();
  }

  private applySession(data: AuthResponseDto): void {
    const user: StoredUser = {
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
      forcePasswordChange: data.forcePasswordChange
    };
    this.tokenStorage.setSession(data.token, data.refreshToken, user);
  }

  /** Home route to redirect to immediately after a successful login, by role. */
  homeRouteForRole(role: UserRole): string {
    if (role === 'Admin') return '/admin/dashboard';
    if (role === 'Manager') return '/manager/dashboard';
    return '/';
  }
}
