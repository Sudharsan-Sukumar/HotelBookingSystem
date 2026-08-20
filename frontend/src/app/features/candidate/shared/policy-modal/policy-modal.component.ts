import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeasonalPolicyService } from '../../../../core/services/seasonal-policy.service';
import { EffectiveCancellationPolicy } from '../../../../core/models/seasonal-policy.model';

export type PolicyType = 'booking' | 'payment' | 'modification' | 'cancellation' | 'profile';

/**
 * Local copy of Shared/UtilityClass/policy_modal.js (PolicyConfirmationModal),
 * scoped to the candidate feature area so it doesn't couple to the bookings
 * feature's own PolicyModalComponent being built concurrently.
 */
@Component({
  selector: 'app-candidate-policy-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './policy-modal.component.html'
})
export class CandidatePolicyModalComponent {
  @ViewChild('modalRoot') modalRoot!: ElementRef<HTMLDivElement>;

  title = 'Please Review Our Policies';
  policyType: PolicyType | null = null;
  consentChecked = false;
  consentErrorVisible = false;
  // Currently effective cancellation policy (seasonal override or base default) — fetched fresh
  // each time the cancellation tab opens so customers always see what admin has configured.
  effectivePolicy: EffectiveCancellationPolicy | null = null;

  private onContinueCallback: (() => void) | null = null;
  private bsModal: any = null;

  constructor(private seasonalPolicyService: SeasonalPolicyService) {}

  show(options: { title: string; policyType: PolicyType; onContinue: () => void }): void {
    this.title = options.title;
    this.policyType = options.policyType;
    this.onContinueCallback = options.onContinue;
    this.consentChecked = false;
    this.consentErrorVisible = false;

    if (options.policyType === 'cancellation') {
      this.effectivePolicy = null;
      this.seasonalPolicyService.getEffective().subscribe({
        next: (res) => this.effectivePolicy = res.data,
        error: () => {}
      });
    }

    const bootstrap = (window as any).bootstrap;
    if (this.modalRoot && bootstrap) {
      this.bsModal = new bootstrap.Modal(this.modalRoot.nativeElement);
      this.bsModal.show();
    }
  }

  hide(): void {
    if (this.bsModal) this.bsModal.hide();
  }

  onBack(): void {
    this.hide();
  }

  onContinue(): void {
    if (!this.consentChecked) {
      this.consentErrorVisible = true;
      return;
    }
    this.hide();
    if (this.onContinueCallback) this.onContinueCallback();
  }
}
