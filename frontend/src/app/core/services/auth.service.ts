import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthResponseDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../models/auth.model';
import { User, UserRole } from '../models/user.model';

const TOKEN_KEY = 'hbs_token';
const REFRESH_TOKEN_KEY = 'hbs_refresh_token';
const USER_KEY = 'hbs_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSignal = signal<User | null>(this.readStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  readonly role = computed<UserRole | null>(() => this.currentUserSignal()?.role ?? null);

  constructor(private readonly http: HttpClient) {}

  login(dto: LoginDto): Observable<ApiResponse<AuthResponseDto>> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.apiUrl}/login`, dto)
      .pipe(tap((res) => res.data && this.persistSession(res.data)));
  }

  register(dto: RegisterDto): Observable<ApiResponse<AuthResponseDto>> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.apiUrl}/register`, dto)
      .pipe(tap((res) => res.data && this.persistSession(res.data)));
  }

  verifyEmail(dto: VerifyEmailDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/verify-email`, dto);
  }

  resendVerification(dto: ResendVerificationDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/resend-verification`, dto);
  }

  forgotPassword(dto: ForgotPasswordDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/forgot-password`, dto);
  }

  resetPassword(dto: ResetPasswordDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/reset-password`, dto);
  }

  refresh(dto: RefreshTokenDto): Observable<ApiResponse<AuthResponseDto>> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.apiUrl}/refresh`, dto)
      .pipe(tap((res) => res.data && this.persistSession(res.data)));
  }

  logout(): Observable<ApiResponse<null>> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/logout`, { refreshToken })
      .pipe(tap(() => this.clearSession()));
  }

  logoutAllDevices(): Observable<ApiResponse<null>> {
    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/logout-all-devices`, {})
      .pipe(tap(() => this.clearSession()));
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private persistSession(auth: AuthResponseDto): void {
    localStorage.setItem(TOKEN_KEY, auth.token);
    if (auth.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
    }
    const user: User = {
      id: String(auth.userId),
      name: `${auth.firstName} ${auth.lastName}`.trim(),
      email: auth.email,
      role: auth.role as UserRole,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
