import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ContentService } from '../../../core/services/content.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { CmsPreviewStore } from '../../../core/services/cms-preview-store.service';

/**
 * Rewired to the real Features/CMS/Controllers/ContentController.cs endpoints
 * (GET/PUT api/content/about). Field names match AboutContentDto exactly:
 * heading, subheading, history.
 *
 * Embedded directly in the Content Management split-screen (left panel) — no longer a routed
 * page, so it carries no top-nav/breadcrumb chrome of its own.
 */
@Component({
  selector: 'app-admin-edit-about',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-about.component.html',
  styleUrls: ['./edit-about.component.scss']
})
export class EditAboutComponent implements OnInit {
  heading = '';
  subheading = '';
  history = '';
  loading = false;
  saving = false;

  constructor(
    private contentService: ContentService,
    private ui: GlobalUiService,
    private previewStore: CmsPreviewStore,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    // markForCheck() after the async response is required: this component is embedded inside
    // ContentComponent's *ngIf tab switch rather than routed directly — that embedding layer
    // prevents the zone's automatic change detection from repainting this view on its own.
    this.contentService.getAbout().subscribe({
      next: (res) => {
        const about = res.data;
        this.heading = about.heading || '';
        this.subheading = about.subheading || '';
        this.history = about.history || '';
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

  /** Mirrors the current (possibly unsaved) heading/subheading into the live preview store. */
  pushPreview(): void {
    this.previewStore.setAbout({
      heading: this.heading,
      subheading: this.subheading
    });
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.saving = true;
    this.contentService.updateAbout({
      heading: this.heading,
      subheading: this.subheading,
      history: this.history
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
