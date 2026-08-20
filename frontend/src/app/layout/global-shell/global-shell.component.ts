import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GlobalUiService } from '../../core/services/global-ui.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-global-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-shell.component.html'
})
export class GlobalShellComponent {
  showBackToTop = false;
  loggingOut = false;

  constructor(public ui: GlobalUiService, private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {
    window.addEventListener('scroll', () => {
      this.showBackToTop = (window.scrollY || document.documentElement.scrollTop || 0) > 200;
    }, { passive: true });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  confirmLogout(): void {
    // Guards against a second click firing a duplicate /api/auth/logout call while the first is
    // still in flight — without this, the second (redundant) request can settle with a 401 after
    // the first one already cleared the session, which previously bounced the user to a confusing
    // "session expired" screen right after a perfectly successful logout.
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.cdr.markForCheck();

    this.auth.logout().subscribe({
      next: () => this.finishLogout(),
      // Even if the server call fails (e.g. token already expired), still clear local session
      // and navigate away — a failed logout call must never trap the user in place.
      error: () => this.finishLogout()
    });
  }

  private finishLogout(): void {
    this.loggingOut = false;
    this.ui.cancelLogout();
    this.router.navigate(['/']);
    this.cdr.markForCheck();
  }
}
