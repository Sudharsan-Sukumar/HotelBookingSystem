import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalShellComponent } from './layout/global-shell/global-shell.component';
import { HotelStateService } from './core/services/hotel-state.service';
import { RenderTickService } from './core/services/render-tick.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('hbs-angular');

  @ViewChild(RouterOutlet) private outlet?: RouterOutlet;

  constructor(private hotelState: HotelStateService, private renderTick: RenderTickService) {}

  ngOnInit(): void {
    this.hotelState.initDefaults();

    // See RenderTickService for why this exists: forces the currently-routed component's own
    // ComponentRef to detectChanges() directly, since ApplicationRef.tick() alone does not reach it
    // in this environment.
    this.renderTick.requests$.subscribe(() => {
      try {
        if (!this.outlet?.isActivated) return;
        // `RouterOutlet.activated` (ComponentRef) is a private runtime property, not part of the
        // public typings, but the only handle to the routed component's *instance*. Calling
        // `ComponentRef.changeDetectorRef.detectChanges()` directly does NOT refresh the view here
        // (verified) — Angular's own `applyChanges` devtools primitive additionally marks the
        // ancestor dirty-path (`markViewDirty`) before checking from the root, which the public
        // ChangeDetectorRef API doesn't expose. `window.ng.applyChanges` (published automatically
        // in dev mode) does exactly that two-step dance and is the only thing confirmed to work.
        const componentRef = (this.outlet as any).activated;
        const instance = componentRef?.instance;
        const ngGlobal = (window as any).ng;
        if (instance && ngGlobal?.applyChanges) {
          ngGlobal.applyChanges(instance);
        }
      } catch {
        // Best-effort — never let a refresh attempt throw into the interceptor chain.
      }
    });
  }
}
