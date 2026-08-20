import { Injectable, signal } from '@angular/core';

/**
 * Coordinates the globally-injected UI pieces that the original app attached
 * to every page via session.js (APK-style toast, logout confirmation modal).
 * Rendered once from AppComponent so every route shares the same instances.
 */
@Injectable({ providedIn: 'root' })
export class GlobalUiService {
  readonly toastMessage = signal<string>('');
  readonly toastVisible = signal<boolean>(false);
  readonly logoutModalVisible = signal<boolean>(false);

  private toastTimer: any = null;

  showToast(message: string, callback?: () => void): void {
    this.toastMessage.set(message);
    this.toastVisible.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible.set(false);
      if (callback) callback();
    }, 1500);
  }

  requestLogoutConfirm(): void {
    this.logoutModalVisible.set(true);
  }

  cancelLogout(): void {
    this.logoutModalVisible.set(false);
  }
}
