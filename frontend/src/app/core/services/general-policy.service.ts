import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { GeneralPolicy, GeneralPolicyRequest, GeneralPolicyType } from '../models/general-policy.model';

/** Real HTTP client for Features/CMS/Controllers/GeneralPoliciesController.cs
 * (api/content/general-policies[/{type}]) — the permanent Privacy/Terms/Modification/
 * Cancellation & Refund policies, separate from the seasonal-policy endpoints. */
@Injectable({ providedIn: 'root' })
export class GeneralPolicyService {
  private readonly base = `${environment.apiUrl}/content/general-policies`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<GeneralPolicy[]>> {
    return this.http.get<ApiResponse<GeneralPolicy[]>>(this.base);
  }

  getByType(policyType: GeneralPolicyType): Observable<ApiResponse<GeneralPolicy>> {
    return this.http.get<ApiResponse<GeneralPolicy>>(`${this.base}/${policyType}`);
  }

  update(policyType: GeneralPolicyType, dto: GeneralPolicyRequest): Observable<ApiResponse<GeneralPolicy>> {
    return this.http.put<ApiResponse<GeneralPolicy>>(`${this.base}/${policyType}`, dto);
  }
}
