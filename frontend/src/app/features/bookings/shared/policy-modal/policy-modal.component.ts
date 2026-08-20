import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeasonalPolicyService } from '../../../../core/services/seasonal-policy.service';
import { EffectiveCancellationPolicy } from '../../../../core/models/seasonal-policy.model';

export type BookingPolicyType = 'booking' | 'payment' | 'modification' | 'cancellation';

/**
 * Local port of Shared/UtilityClass/policy_modal.js (PolicyConfirmationModal),
 * scoped to the bookings feature. Reused by room-selection / guest-details /
 * invoice-summary wherever the original pages invoked window.policyModal.show(...).
 */
@Component({
  selector: 'app-booking-policy-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './policy-modal.component.html'
})
export class PolicyModalComponent {
  @ViewChild('modalRoot') modalRoot!: ElementRef<HTMLDivElement>;

  @Output() continue = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  title = 'Please Review Our Policies';
  policyType: BookingPolicyType | null = null;
  consentChecked = false;
  consentErrorVisible = false;
  // Currently effective cancellation policy (seasonal override or base default) — fetched fresh
  // each time the cancellation tab opens so customers always see what admin has configured, not
  // a hardcoded snapshot. Null while loading; the modal falls back to the long-standing 48h/24h/
  // 50% defaults in the template until it resolves.
  effectivePolicy: EffectiveCancellationPolicy | null = null;

  private bsModal: any = null;

  constructor(private seasonalPolicyService: SeasonalPolicyService) {}

  open(policyType: BookingPolicyType, title?: string): void {
    this.policyType = policyType;
    this.title = title || 'Please Review Our Policies';
    this.consentChecked = false;
    this.consentErrorVisible = false;

    if (policyType === 'cancellation') {
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

  onBackClick(): void {
    this.hide();
    this.back.emit();
  }

  onContinueClick(): void {
    if (!this.consentChecked) {
      this.consentErrorVisible = true;
      return;
    }
    this.hide();
    this.continue.emit();
  }
}
