import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ManagerResponseDto, Review, ReviewCreateDto } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly apiUrl = `${environment.apiUrl}/reviews`;

  constructor(private readonly http: HttpClient) {}

  getForHotel(hotelId: number): Observable<ApiResponse<Review[]>> {
    return this.http.get<ApiResponse<Review[]>>(`${this.apiUrl}/hotel/${hotelId}`);
  }

  submit(dto: ReviewCreateDto): Observable<ApiResponse<Review>> {
    return this.http.post<ApiResponse<Review>>(`${this.apiUrl}/submit`, dto);
  }

  update(reviewId: number, dto: ReviewCreateDto): Observable<ApiResponse<Review>> {
    return this.http.put<ApiResponse<Review>>(`${this.apiUrl}/${reviewId}`, dto);
  }

  delete(reviewId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${reviewId}`);
  }

  respond(reviewId: number, dto: ManagerResponseDto): Observable<ApiResponse<Review>> {
    return this.http.post<ApiResponse<Review>>(`${this.apiUrl}/${reviewId}/respond`, dto);
  }
}
