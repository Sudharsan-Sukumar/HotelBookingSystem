import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'hbs_access_token';
const REFRESH_TOKEN_KEY = 'hbs_refresh_token';
const USER_KEY = 'hbs_current_user';

export interface StoredUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Admin' | 'Customer' | 'Manager';
  forcePasswordChange: boolean;
}

// Singleton Pattern — providedIn:'root' gives one shared instance app-wide (Admin + Customer + Manager).
/** Centralizes where the JWT/refresh token/user snapshot live so AuthService and the interceptor agree. */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getUser(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  setSession(accessToken: string, refreshToken: string | undefined, user: StoredUser): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  updateAccessToken(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
