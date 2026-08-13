import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class Reviews implements OnChanges {
  @Input({ required: true }) hotelId!: number;
  @Input() bookingId: number | null = null;

  private readonly reviewService = inject(ReviewService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly reviews = signal<Review[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', Validators.maxLength(1000)],
  });

  ngOnChanges(): void {
    if (this.hotelId) {
      this.loadReviews();
    }
  }

  loadReviews(): void {
    this.loading.set(true);
    this.reviewService.getForHotel(this.hotelId).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.reviews.set(res.data ?? []);
      },
      error: () => this.loading.set(false),
    });
  }

  submitReview(): void {
    this.errorMessage.set(null);
    if (this.form.invalid || !this.bookingId) {
      this.form.markAllAsTouched();
      if (!this.bookingId) {
        this.errorMessage.set('You can only review a hotel after completing a stay.');
      }
      return;
    }

    const { rating, comment } = this.form.getRawValue();
    this.submitting.set(true);

    this.reviewService.submit({ bookingId: this.bookingId, rating: rating!, comment: comment || undefined }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset({ rating: 5, comment: '' });
        this.loadReviews();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Could not submit your review.');
      },
    });
  }

  averageRating(): number {
    const list = this.reviews();
    if (!list.length) return 0;
    return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  }
}
