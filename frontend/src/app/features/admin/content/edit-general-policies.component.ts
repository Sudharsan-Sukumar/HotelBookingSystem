import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { GeneralPolicyService } from '../../../core/services/general-policy.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { CmsPreviewStore } from '../../../core/services/cms-preview-store.service';
import { GeneralPolicy, GeneralPolicyType } from '../../../core/models/general-policy.model';

interface PolicyTab {
  type: GeneralPolicyType;
  label: string;
}

/**
 * Admin editor for the four PERMANENT hotel policies (Privacy, Terms & Conditions, Modification,
 * Cancellation & Refund) against Features/CMS/Controllers/GeneralPoliciesController.cs
 * (GET/PUT api/content/general-policies/{type}). Deliberately separate from the existing seasonal
 * PolicyManagementComponent — these are the always-in-effect policy text shown in the customer
 * footer modals, not date-range-scoped overrides.
 *
 * Embedded as a 4th tab in the Content Management split-screen (alongside Hero/About/Contact) so
 * it can push in-progress edits into CmsPreviewStore the same way those three already do — the
 * embedded <app-landing> preview's footer picks up the change immediately via its own preview
 * subscription, exactly mirroring the established Hero/About/Contact live-preview pattern.
 */
@Component({
  selector: 'app-admin-edit-general-policies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-general-policies.component.html',
  styleUrls: ['./edit-general-policies.component.scss']
})
export class EditGeneralPoliciesComponent implements OnInit, AfterViewInit {
  // Content is still stored/transmitted as HTML (unchanged API/DB shape) — the admin just never
  // has to see or type a tag. @ViewChild below is a contenteditable surface driven by document
  // execCommand toolbar buttons instead of a raw HTML textarea.
  @ViewChild('editorSurface') editorSurfaceRef!: ElementRef<HTMLDivElement>;

  readonly tabs: PolicyTab[] = [
    { type: 'Privacy', label: 'Privacy Policy' },
    { type: 'Terms', label: 'Terms & Conditions' },
    { type: 'Modification', label: 'Modification Policy' },
    { type: 'CancellationRefund', label: 'Cancellation & Refund Policy' }
  ];

  activeType: GeneralPolicyType = 'Privacy';
  policies: Record<GeneralPolicyType, GeneralPolicy | null> = {
    Privacy: null,
    Terms: null,
    Modification: null,
    CancellationRefund: null
  };

  title = '';
  content = '';
  loading = false;
  saving = false;
  viewReady = false;

  constructor(
    private policyService: GeneralPolicyService,
    private ui: GlobalUiService,
    private previewStore: CmsPreviewStore,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.policyService.getAll().subscribe({
      next: (res) => {
        for (const policy of res.data) {
          this.policies[policy.policyType] = policy;
        }
        this.loading = false;
        this.cdr.markForCheck();
        // The contenteditable surface only exists in the DOM once *ngIf="!loading" renders it —
        // wait a tick so ViewChild is populated before the first innerHTML sync.
        setTimeout(() => this.loadIntoForm(this.activeType));
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  selectTab(type: GeneralPolicyType): void {
    this.activeType = type;
    this.loadIntoForm(type);
  }

  private loadIntoForm(type: GeneralPolicyType): void {
    const policy = this.policies[type];
    this.title = policy?.title || '';
    this.content = policy?.content || '';
    if (this.editorSurfaceRef) {
      this.editorSurfaceRef.nativeElement.innerHTML = this.content;
    }
    this.pushPreview();
  }

  /** Called on every contenteditable input — reads the live-formatted HTML back into `content`. */
  onEditorInput(): void {
    this.content = this.editorSurfaceRef.nativeElement.innerHTML;
    this.pushPreview();
  }

  /** Toolbar buttons: Bold/Italic/Underline/Heading/Paragraph/lists — no raw HTML typing needed. */
  format(command: string, value?: string): void {
    this.editorSurfaceRef.nativeElement.focus();
    document.execCommand(command, false, value);
    this.onEditorInput();
  }

  onTitleChange(): void {
    this.pushPreview();
  }

  /** Mirrors the current (possibly unsaved) title/content into the live preview store. */
  pushPreview(): void {
    this.previewStore.setGeneralPolicy({
      policyType: this.activeType,
      title: this.title,
      content: this.content
    });
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || !this.content.trim()) {
      return;
    }

    this.saving = true;
    this.policyService.update(this.activeType, { title: this.title, content: this.content }).subscribe({
      next: (res) => {
        this.policies[this.activeType] = res.data;
        this.saving = false;
        this.ui.showToast('Policy Published Successfully.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }
}
