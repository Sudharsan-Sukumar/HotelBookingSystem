import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';

// Minimal shape of the bits of the Google Identity Services API this component actually uses —
// the real script (loaded at runtime below) defines `window.google.accounts.id`, not a package
// this app installs; there is no official @types package for it.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(parent: HTMLElement, options: { theme?: string; size?: string; width?: number; text?: string }): void;
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let gisScriptLoadingPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptLoadingPromise) return gisScriptLoadingPromise;

  gisScriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    document.head.appendChild(script);
  });
  return gisScriptLoadingPromise;
}

/**
 * Renders Google's own "Sign in with Google" button (via Google Identity Services), not a custom
 * button that redirects through a manual OAuth flow — this is the standard, Google-recommended
 * integration for an SPA. On a successful sign-in, Google hands this component a signed ID token
 * (`response.credential`) directly; this component's only job is to forward that token to whoever
 * is listening (see (idToken) output) — verifying it is the backend's job (AuthService.GoogleLoginAsync),
 * never the frontend's.
 */
@Component({
  selector: 'app-google-signin-button',
  standalone: true,
  template: `<div #buttonContainer></div>
    @if (loadError) {
      <p class="google-signin-error">Google Sign-In is unavailable right now.</p>
    }`,
  styles: [`.google-signin-error { color: var(--bs-danger, #dc3545); font-size: 0.85rem; margin-top: 0.5rem; }`]
})
export class GoogleSigninButtonComponent implements OnInit {
  @ViewChild('buttonContainer', { static: true }) buttonContainer!: ElementRef<HTMLElement>;
  @Output() idToken = new EventEmitter<string>();

  loadError = false;

  ngOnInit(): void {
    if (!environment.googleClientId) {
      // Not configured — fail silently rather than breaking the login/register page for everyone
      // else. See environment.ts for how to configure a real Client ID.
      return;
    }

    loadGoogleIdentityScript()
      .then(() => {
        window.google!.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response) => this.idToken.emit(response.credential)
        });
        window.google!.accounts.id.renderButton(this.buttonContainer.nativeElement, {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'continue_with'
        });
      })
      .catch(() => {
        this.loadError = true;
      });
  }
}
