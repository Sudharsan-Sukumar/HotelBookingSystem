import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ContentService } from '../../../core/services/content.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { CmsPreviewStore } from '../../../core/services/cms-preview-store.service';
import { environment } from '../../../../environments/environment';

/**
 * Rewired to the real Features/CMS/Controllers/ContentController.cs endpoints
 * (GET/PUT api/content/hero). Field names match HeroContentDto exactly:
 * heading, subheading, backgroundImageUrl. There is no CTA text/link field
 * on the backend DTO, so those inputs from the original mock were dropped.
 *
 * Embedded directly in the Content Management split-screen (left panel) — no longer a routed
 * page, so it carries no top-nav/breadcrumb chrome of its own.
 */
@Component({
  selector: 'app-admin-edit-hero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-hero.component.html',
  styleUrls: ['./edit-hero.component.scss']
})
export class EditHeroComponent implements OnInit {
  heading = '';
  subheading = '';
  backgroundImageUrl = '';
  loading = false;
  saving = false;
  uploading = false;
  uploadError = '';

  private readonly origin = environment.apiUrl.replace(/\/api\/?$/, '');

  /** Uploaded images come back as a server-relative path (e.g. "/images/hero/x.jpg"), served by
   * the API host, not the Angular dev server — resolve it to an absolute URL for the thumbnail
   * preview. Frontend-served defaults (/assets/...) and admin-typed absolute URLs pass through. */
  resolveImageUrl(url: string): string {
    if (!url) return url;
    if (/^https?:\/\//i.test(url) || url.startsWith('/assets/')) return encodeURI(url);
    return encodeURI(`${this.origin}${url}`);
  }

  constructor(
    private contentService: ContentService,
    private ui: GlobalUiService,
    private previewStore: CmsPreviewStore,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    // markForCheck() after the async response is required here: this component is now embedded
    // inside ContentComponent's *ngIf tab switch rather than routed directly, and that extra
    // embedding layer was found (on LandingComponent/FooterComponent) to prevent the zone's
    // automatic change detection from repainting this view — without it "Loading…" never clears.
    this.contentService.getHero().subscribe({
      next: (res) => {
        const hero = res.data;
        this.heading = hero.heading || '';
        this.subheading = hero.subheading || '';
        this.backgroundImageUrl = hero.backgroundImageUrl || '';
        this.loading = false;
        this.pushPreview();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError = '';
    this.uploading = true;
    this.contentService.uploadHeroImage(file).subscribe({
      next: (res) => {
        this.backgroundImageUrl = res.data;
        this.uploading = false;
        this.pushPreview();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadError = err?.error?.message || err?.error?.errors?.[0] || 'Image upload failed.';
        this.uploading = false;
        this.cdr.markForCheck();
      }
    });
    // Allow re-selecting the same file later (e.g. after fixing an error).
    input.value = '';
  }

  /** Mirrors the current (possibly unsaved) form values into the live preview store. */
  pushPreview(): void {
    this.previewStore.setHero({
      heading: this.heading,
      subheading: this.subheading,
      backgroundImageUrl: this.backgroundImageUrl
    });
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.saving = true;
    this.contentService.updateHero({
      heading: this.heading,
      subheading: this.subheading,
      backgroundImageUrl: this.backgroundImageUrl
    }).subscribe({
      next: () => {
        this.saving = false;
        this.ui.showToast('Content Published Successfully.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }
}
