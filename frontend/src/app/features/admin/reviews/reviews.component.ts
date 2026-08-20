import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Review, AdminDeleteReviewDto } from '../../../core/models/review.model';
import { HotelResponseDto } from '../../../core/models/hotel.model';

/**
 * Review Moderation admin page.
 * Features/Reviews/Controllers/ReviewsController.cs has no "get all reviews" admin
 * endpoint — only GET /api/Reviews/hotel/{hotelId}. This page is therefore a
 * hotel-picker + per-hotel review list, with DELETE /api/Reviews/admin/{reviewId}
 * (body: { reason }) as the moderation action.
 */
@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit {
  private readonly hotelsBase = `${environment.apiUrl}/hotels`;
  private readonly reviewsBase = `${environment.apiUrl}/Reviews`;

  hotels: HotelResponseDto[] = [];
  selectedHotelId: number | null = null;

  reviews: Review[] = [];
  isLoadingHotels = false;
  isLoadingReviews = false;

  // Moderation (delete) modal
  showDeleteModal = false;
  deleteTarget: Review | null = null;
  deleteReason = '';
  deleteReasonError = '';
  isDeleting = false;

  constructor(private http: HttpClient, private ui: GlobalUiService) {}

  ngOnInit(): void {
    this.loadHotels();
  }

  loadHotels(): void {
    this.isLoadingHotels = true;
    this.http.get<ApiResponse<HotelResponseDto[]>>(this.hotelsBase).subscribe({
      next: res => {
        this.hotels = res.data || [];
        this.isLoadingHotels = false;
        if (this.hotels.length && this.selectedHotelId == null) {
          this.selectedHotelId = this.hotels[0].id;
          this.loadReviews();
        }
      },
      error: () => {
        this.isLoadingHotels = false;
        this.ui.showToast('Failed to load hotels.');
      }
    });
  }

  onHotelChange(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    if (this.selectedHotelId == null) return;
    this.isLoadingReviews = true;
    this.http.get<ApiResponse<Review[]>>(`${this.reviewsBase}/hotel/${this.selectedHotelId}`).subscribe({
      next: res => {
        this.reviews = res.data || [];
        this.isLoadingReviews = false;
      },
      error: () => {
        this.reviews = [];
        this.isLoadingReviews = false;
        this.ui.showToast('Failed to load reviews for this hotel.');
      }
    });
  }

  get averageRating(): number {
    if (!this.reviews.length) return 0;
    return this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length;
  }

  // ---- Moderation ----

  requestDelete(r: Review): void {
    this.deleteTarget = r;
    this.deleteReason = '';
    this.deleteReasonError = '';
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    this.deleteReasonError = '';
    const reason = this.deleteReason.trim();
    if (!reason) {
      this.deleteReasonError = 'A moderation reason is required.';
      return;
    }
    if (!this.deleteTarget) return;

    const body: AdminDeleteReviewDto = { reason };
    this.isDeleting = true;
    this.http.request<ApiResponse<null>>('delete', `${this.reviewsBase}/admin/${this.deleteTarget.id}`, { body }).subscribe({
      next: res => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.ui.showToast(res.message || 'Review deleted successfully.');
        this.loadReviews();
      },
      error: err => {
        this.isDeleting = false;
        this.deleteReasonError = err?.error?.message || 'Failed to delete review.';
      }
    });
  }
}
