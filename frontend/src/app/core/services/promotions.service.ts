import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PromotionRequestDto, PromotionResponseDto } from '../models/promotion.model';

/**
 * Real HTTP client for Features/CMS/Controllers/PromotionsController.cs (api/promotions/*).
 * GET endpoints are public (no auth) — GetAll returns only active promotions unless the
 * caller is an authenticated Admin, in which case inactive ones are included too.
 * POST/PUT/DELETE require the Admin role (enforced server-side).
 */
@Injectable({ providedIn: 'root' })
export class PromotionsService {
  private readonly base = `${environment.apiUrl}/promotions`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<PromotionResponseDto[]>> {
    return this.http.get<ApiResponse<PromotionResponseDto[]>>(this.base);
  }

  getById(id: number): Observable<ApiResponse<PromotionResponseDto>> {
    return this.http.get<ApiResponse<PromotionResponseDto>>(`${this.base}/${id}`);
  }

  create(dto: PromotionRequestDto): Observable<ApiResponse<PromotionResponseDto>> {
    return this.http.post<ApiResponse<PromotionResponseDto>>(this.base, dto);
  }

  update(id: number, dto: PromotionRequestDto): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }
}
