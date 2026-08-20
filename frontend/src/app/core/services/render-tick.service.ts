import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Bridges async HTTP completions (from the error interceptor) to a forced re-render of the
 * currently-routed component.
 *
 * Root cause this works around (confirmed empirically, not guessed): in this environment, a plain
 * component-property mutation made inside an HttpClient `.subscribe()` callback never becomes
 * visible in the DOM — not via zone.js + provideZoneChangeDetection, not via `ApplicationRef.tick()`
 * (called directly, wrapped in `NgZone.run()`, with the mutation itself run inside `NgZone.run()` —
 * all verified via `ng.getComponent()`/DOM inspection to leave the bound property correctly updated
 * but the view unrefreshed), and not fixable by clearing the dev-server cache or a fully cold
 * restart. The ONLY thing that reliably forces a re-render is calling `ChangeDetectorRef
 * .detectChanges()` directly on the *specific* routed component's own `ComponentRef` (exactly what
 * Angular DevTools' `applyChanges()` does) — `ApplicationRef.tick()`'s tree walk does not reach it.
 * `AppComponent` holds the `RouterOutlet` and forwards its currently-activated `ComponentRef` here
 * so any interceptor/service can request a refresh without importing router internals itself.
 */
@Injectable({ providedIn: 'root' })
export class RenderTickService {
  private readonly requestSubject = new Subject<void>();
  readonly requests$ = this.requestSubject.asObservable();

  requestTick(): void {
    this.requestSubject.next();
  }
}
