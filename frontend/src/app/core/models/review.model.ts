/** Mirrors Features/Reviews/DTOs/ReviewCreateDto.cs exactly — used by POST /api/reviews/submit
 *  and PUT /api/reviews/{id} (customer-facing submit/edit). */
export interface ReviewCreateDto {
  bookingId: number;
  rating: number;
  comment?: string | null;
}

/** Matches Features/Reviews/Models/Review.cs (curl-confirmed shape via GET /api/Reviews/hotel/{id};
 *  navigation props Booking/Customer/Hotel are not populated by GetHotelReviewsAsync so they're
 *  omitted here — only the entity's own scalar columns are modeled). */
export interface Review {
  id: number;
  bookingId: number;
  customerId: number;
  hotelId: number;
  rating: number;
  comment: string | null;
  managerResponse: string | null;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
}

/** Matches ReviewsController.AdminDeleteReviewDto. */
export interface AdminDeleteReviewDto {
  reason: string;
}
