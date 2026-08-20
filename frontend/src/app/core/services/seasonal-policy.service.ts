import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { EffectiveCancellationPolicy, SeasonalPolicy, SeasonalPolicyRequest } from '../models/seasonal-policy.model';

/**
 * Real HTTP client for Features/CMS/Controllers/SeasonalPoliciesController.cs
 * (api/admin/policies — Admin CRUD) and the sibling PoliciesController
 * (api/policies/effective — any authenticated role, read-only).
 */
@Injectable({ providedIn: 'root' })
export class SeasonalPolicyService {
  private readonly adminBase = `${environment.apiUrl}/admin/policies`;
  private readonly publicBase = `${environment.apiUrl}/policies`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<SeasonalPolicy[]>> {
    return this.http.get<ApiResponse<SeasonalPolicy[]>>(this.adminBase);
  }

  create(dto: SeasonalPolicyRequest): Observable<ApiResponse<SeasonalPolicy>> {
    return this.http.post<ApiResponse<SeasonalPolicy>>(this.adminBase, dto);
  }

  update(id: number, dto: SeasonalPolicyRequest): Observable<ApiResponse<SeasonalPolicy>> {
    return this.http.put<ApiResponse<SeasonalPolicy>>(`${this.adminBase}/${id}`, dto);
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.adminBase}/${id}`);
  }

  getEffective(forDate?: string): Observable<ApiResponse<EffectiveCancellationPolicy>> {
    const url = forDate ? `${this.publicBase}/effective?forDate=${forDate}` : `${this.publicBase}/effective`;
    return this.http.get<ApiResponse<EffectiveCancellationPolicy>>(url);
  }
}
