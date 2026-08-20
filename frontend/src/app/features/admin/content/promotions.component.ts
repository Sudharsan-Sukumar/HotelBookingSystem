import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PromotionsService } from '../../../core/services/promotions.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { PromotionResponseDto } from '../../../core/models/promotion.model';

const COUPON_CODE_PATTERN = /^[A-Z0-9]{5,15}$/;

/**
 * Admin Promotions screen — full CRUD against
 * Features/CMS/Controllers/PromotionsController.cs (api/promotions[/{id}]).
 * List + inline add/edit form on one component (mode flag), following the
 * exact same pattern as help-articles.component.ts.
 */
@Component({
  selector: 'app-admin-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.scss']
})
export class PromotionsComponent implements OnInit {
  promotions: PromotionResponseDto[] = [];
  loading = false;

  showForm = false;
  editingId: number | null = null;
  saving = false;

  title = '';
  discountDescription = '';
  couponCode = '';
  validUntil = '';
  imageUrl = '';
  isActive = true;

  couponCodeError = '';

  constructor(
    private promotionsService: PromotionsService,
    private ui: GlobalUiService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.promotionsService.getAll().subscribe({
      next: (res) => {
        this.promotions = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openAdd(): void {
    this.editingId = null;
    this.title = '';
    this.discountDescription = '';
    this.couponCode = '';
    this.validUntil = '';
    this.imageUrl = '';
    this.isActive = true;
    this.couponCodeError = '';
    this.showForm = true;
  }

  openEdit(promo: PromotionResponseDto): void {
    this.editingId = promo.id;
    this.title = promo.title;
    this.discountDescription = promo.discountDescription;
    this.couponCode = promo.couponCode;
    this.validUntil = promo.validUntil ? promo.validUntil.substring(0, 10) : '';
    this.imageUrl = promo.imageUrl || '';
    this.isActive = promo.isActive;
    this.couponCodeError = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  /** Auto-uppercase the coupon code as the admin types, so the regex check below reflects intent. */
  onCouponCodeInput(value: string): void {
    this.couponCode = (value || '').toUpperCase();
    this.validateCouponCode();
  }

  validateCouponCode(): boolean {
    if (!this.couponCode) {
      this.couponCodeError = 'Coupon code is required.';
    } else if (!COUPON_CODE_PATTERN.test(this.couponCode)) {
      this.couponCodeError = 'Must be 5-15 uppercase letters/numbers only (A-Z, 0-9).';
    } else {
      this.couponCodeError = '';
    }
    return !this.couponCodeError;
  }

  onSubmit(form: NgForm): void {
    // Uppercase defensively on submit too, in case the value was pasted or bound without triggering onCouponCodeInput.
    this.couponCode = (this.couponCode || '').toUpperCase();

    if (form.invalid || !this.validateCouponCode()) {
      return;
    }

    this.saving = true;
    const dto = {
      title: this.title,
      discountDescription: this.discountDescription,
      couponCode: this.couponCode,
      validUntil: this.validUntil,
      imageUrl: this.imageUrl || '',
      isActive: this.isActive
    };

    const onSuccess = () => {
      this.saving = false;
      this.showForm = false;
      this.editingId = null;
      this.ui.showToast(this.editingId ? 'Promotion updated successfully.' : 'Promotion created successfully.');
      this.load();
    };
    const onError = () => {
      this.saving = false;
    };

    if (this.editingId) {
      this.promotionsService.update(this.editingId, dto).subscribe({ next: onSuccess, error: onError });
    } else {
      this.promotionsService.create(dto).subscribe({ next: onSuccess, error: onError });
    }
  }

  toggleActive(promo: PromotionResponseDto): void {
    const dto = {
      title: promo.title,
      discountDescription: promo.discountDescription,
      couponCode: promo.couponCode,
      validUntil: promo.validUntil,
      imageUrl: promo.imageUrl || '',
      isActive: !promo.isActive
    };
    this.promotionsService.update(promo.id, dto).subscribe({
      next: () => {
        this.ui.showToast(dto.isActive ? 'Promotion activated.' : 'Promotion deactivated.');
        this.load();
      }
    });
  }

  deletePromotion(promo: PromotionResponseDto): void {
    if (!confirm(`Delete promotion "${promo.title}"?`)) {
      return;
    }
    this.promotionsService.delete(promo.id).subscribe({
      next: () => {
        this.ui.showToast('Promotion deleted successfully.');
        this.load();
      }
    });
  }
}
