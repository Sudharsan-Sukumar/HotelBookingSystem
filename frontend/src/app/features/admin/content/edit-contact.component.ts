import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ContentService } from '../../../core/services/content.service';
import { ValidationService } from '../../../core/services/validation.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { CmsPreviewStore } from '../../../core/services/cms-preview-store.service';

/**
 * Rewired to the real Features/CMS/Controllers/ContentController.cs endpoints
 * (GET/PUT api/content/contact). Field names match ContactContentDto exactly:
 * phone, email, address.
 *
 * Embedded directly in the Content Management split-screen (left panel) — no longer a routed
 * page, so it carries no top-nav/breadcrumb chrome of its own.
 */
@Component({
  selector: 'app-admin-edit-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-contact.component.html',
  styleUrls: ['./edit-contact.component.scss']
})
export class EditContactComponent implements OnInit {
  phone = '';
  email = '';
  address = '';

  emailInvalid = false;
  phoneInvalid = false;
  loading = false;
  saving = false;

  constructor(
    private contentService: ContentService,
    private validation: ValidationService,
    private ui: GlobalUiService,
    private previewStore: CmsPreviewStore,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    // markForCheck() after the async response is required: this component is embedded inside
    // ContentComponent's *ngIf tab switch rather than routed directly — that embedding layer
    // prevents the zone's automatic change detection from repainting this view on its own (this
    // was the exact cause of "Loading…" never clearing on the Contact tab).
    this.contentService.getContact().subscribe({
      next: (res) => {
        const contact = res.data;
        this.phone = contact.phone || '';
        this.email = contact.email || '';
        this.address = contact.address || '';
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

  /** Mirrors the current (possibly unsaved) phone/email into the live preview store. */
  pushPreview(): void {
    this.previewStore.setContact({
      phone: this.phone,
      email: this.email
    });
  }

  private validate(): boolean {
    this.emailInvalid = !this.validation.isValidEmail(this.email);
    this.phoneInvalid = !this.validation.isValidPhone(this.phone);
    return !this.emailInvalid && !this.phoneInvalid;
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || !this.validate()) {
      return;
    }

    this.saving = true;
    this.contentService.updateContact({
      phone: this.phone,
      email: this.email,
      address: this.address
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
