import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { SystemSetting } from '../models/cms.model';

/** Real HTTP client for Features/CMS/Controllers/SystemSettingsController.cs (api/systemsettings). */
@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  private readonly base = `${environment.apiUrl}/systemsettings`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<SystemSetting[]>> {
    return this.http.get<ApiResponse<SystemSetting[]>>(this.base);
  }

  getByKey(key: string): Observable<ApiResponse<SystemSetting>> {
    return this.http.get<ApiResponse<SystemSetting>>(`${this.base}/${key}`);
  }

  create(dto: SystemSetting): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.base, dto);
  }

  update(key: string, dto: SystemSetting): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.base}/${key}`, dto);
  }
}
