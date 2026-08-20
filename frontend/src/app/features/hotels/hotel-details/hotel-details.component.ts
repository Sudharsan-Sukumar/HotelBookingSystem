import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';
import { Review } from '../../../core/models/review.model';

/**
 * Real-backend version. Replaces HotelStateService mock lookups with:
 *  - GET /api/hotels/{id}                -> HotelResponseDto
 *  - GET /api/hotels/{id}/roomtypes      -> RoomTypeResponseDto[] (used only to show a starting price)
 *  - GET /api/reviews/hotel/{id}         -> Review[] (public) -- average rating computed client-side
 *
 * NOTE (backend gap): HotelResponseDto carries no gallery/amenities array (only a single
 * thumbnailUrl) and no average-rating field, unlike the old HotelStateService mock which had
 * both. The gallery + amenities cards below degrade gracefully to what the API actually returns.
 */
@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './hotel-details.component.html',
  styleUrl: './hotel-details.component.scss'
})
export class HotelDetailsComponent implements OnInit {
  private readonly base = environment.apiUrl;

  hotel: HotelResponseDto | null = null;
  hotelId = '';
  loadFailed = false;

  roomTypes: RoomTypeResponseDto[] = [];
  startingPrice: number | null = null;

  mainImage = '';

  isBooking = false;

  // Reviews
  reviews: Review[] = [];
  reviewsLoading = false;
  averageRating: number | null = null;

  // Write-a-review entry point (only meaningful when navigated here with a completed booking id)
  reviewableBookingId: number | null = null;
  showReviewForm = false;
  reviewRating = 5;
  reviewComment = '';
  reviewSubmitting = false;
  reviewSubmitError = '';
  reviewSubmitSuccess = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private ui: GlobalUiService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.hotelId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('hotelId') || '';

    // Optional: ?reviewBookingId=123 lets booking-success deep-link here to leave a review.
    const reviewBookingIdParam = this.route.snapshot.queryParamMap.get('reviewBookingId');
    if (reviewBookingIdParam) {
      this.reviewableBookingId = Number(reviewBookingIdParam);
      this.showReviewForm = true;
    }

    if (!this.hotelId) {
      this.loadFailed = true;
      return;
    }

    forkJoin({
      hotel: this.http.get<ApiResponse<HotelResponseDto>>(`${this.base}/hotels/${this.hotelId}`).pipe(
        catchError(() => of(null))
      ),
      roomTypes: this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/hotels/${this.hotelId}/roomtypes`).pipe(
        catchError(() => of(null))
      )
    }).subscribe(({ hotel, roomTypes }) => {
      if (!hotel || !hotel.data) {
        this.loadFailed = true;
        return;
      }
      this.hotel = hotel.data;
      this.titleService.setTitle(`${this.hotel.name} | Elegant Enclave`);
      this.mainImage = this.hotel.thumbnailUrl || '/assets/images/hotel_cbe.png';

      this.roomTypes = (roomTypes?.data || []).filter(r => r.isActive && !r.isUnderMaintenance);
      this.startingPrice = this.roomTypes.length
        ? Math.min(...this.roomTypes.map(r => r.basePrice))
        : null;

      this.loadReviews();
    });
  }

  private loadReviews(): void {
    this.reviewsLoading = true;
    this.http.get<ApiResponse<Review[]>>(`${this.base}/reviews/hotel/${this.hotelId}`).pipe(
      catchError(() => of({ success: false, message: '', data: [] as Review[], errors: [] }))
    ).subscribe(res => {
      this.reviews = (res.data || []).filter(r => !r.isDeleted);
      this.averageRating = this.reviews.length
        ? Math.round((this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length) * 10) / 10
        : null;
      this.reviewsLoading = false;
    });
  }

  formatPrice(value: number | null): string {
    if (value == null) return '';
    return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  }

  starsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < Math.round(rating) ? 1 : 0));
  }

  bookNow(): void {
    if (!this.auth.isLoggedIn) {
      this.ui.showToast('Please login to continue with room booking.', () => this.router.navigate(['/auth/login']));
      return;
    }

    this.isBooking = true;
    setTimeout(() => {
      this.isBooking = false;
      this.router.navigate(['/bookings/room-selection'], { queryParams: { hotelId: this.hotelId } });
    }, 400);
  }

  submitReview(): void {
    if (!this.reviewableBookingId) return;
    if (this.reviewRating < 1 || this.reviewRating > 5) return;
    // Mirrors backend SafeText regex ^[^<>{}]+$ client-side.
    if (this.reviewComment && /[<>{}]/.test(this.reviewComment)) {
      this.reviewSubmitError = 'Comment cannot contain < > { } characters.';
      return;
    }
    if (this.reviewComment && this.reviewComment.length > 1000) {
      this.reviewSubmitError = 'Comment cannot exceed 1000 characters.';
      return;
    }

    this.reviewSubmitting = true;
    this.reviewSubmitError = '';

    this.http.post<ApiResponse<Review>>(`${this.base}/reviews/submit`, {
      bookingId: this.reviewableBookingId,
      rating: this.reviewRating,
      comment: this.reviewComment || null
    }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.reviewSubmitSuccess = true;
        this.showReviewForm = false;
        this.loadReviews();
      },
      error: (err: HttpErrorResponse) => {
        this.reviewSubmitting = false;
        this.reviewSubmitError = (err as any).friendlyMessage || 'Could not submit review. Please try again.';
      }
    });
  }
}
