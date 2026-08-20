import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface HeroPreviewState {
  heading: string;
  subheading: string;
  backgroundImageUrl: string;
}

export interface AboutPreviewState {
  heading: string;
  subheading: string;
}

export interface ContactPreviewState {
  phone: string;
  email: string;
}

export interface GeneralPolicyPreviewState {
  policyType: string;
  title: string;
  content: string;
}

/**
 * Holds the Content Management editors' current in-progress (not-yet-saved) field values, so the
 * embedded Landing Page preview on the same screen can reflect keystrokes immediately without
 * waiting for a Save/PUT round-trip. This is purely an in-memory mirror of the edit forms' own
 * component state — it never itself talks to the backend; Save still goes through the existing
 * ContentService/API exactly as before.
 */
// Observer Pattern — BehaviorSubjects let the Admin CMS editors publish edits the live preview subscribes to.
@Injectable({ providedIn: 'root' })
export class CmsPreviewStore {
  readonly hero$ = new BehaviorSubject<HeroPreviewState | null>(null);
  readonly about$ = new BehaviorSubject<AboutPreviewState | null>(null);
  readonly contact$ = new BehaviorSubject<ContactPreviewState | null>(null);

  // Keyed by policyType (Privacy/Terms/Modification/CancellationRefund) so the footer's preview
  // subscriber can pick out just the one currently being edited without the others going stale.
  readonly generalPolicy$ = new BehaviorSubject<GeneralPolicyPreviewState | null>(null);

  setHero(state: HeroPreviewState): void {
    this.hero$.next(state);
  }

  setAbout(state: AboutPreviewState): void {
    this.about$.next(state);
  }

  setContact(state: ContactPreviewState): void {
    this.contact$.next(state);
  }

  setGeneralPolicy(state: GeneralPolicyPreviewState): void {
    this.generalPolicy$.next(state);
  }
}
