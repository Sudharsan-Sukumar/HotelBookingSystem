import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ChangePasswordDto, ProfileUpdateDto, UserDto } from '../models/profile.model';

/** Real HTTP client for Users/Controllers/ProfileController.cs (any authenticated role). */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly base = `${environment.apiUrl}/profile`;

  constructor(private http: HttpClient) {}

  getOwnProfile(): Observable<ApiResponse<UserDto>> {
    return this.http.get<ApiResponse<UserDto>>(this.base);
  }

  updateProfile(dto: ProfileUpdateDto): Observable<ApiResponse<UserDto>> {
    return this.http.put<ApiResponse<UserDto>>(`${this.base}/edit`, dto);
  }

  changePassword(dto: ChangePasswordDto): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/change-password`, dto);
  }

  uploadPhoto(file: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('File', file);
    return this.http.post<ApiResponse<string>>(`${this.base}/photo`, formData);
  }

  /** Fetches the binary photo as a Blob — build an object URL from it for display. */
  getPhotoBlob(): Observable<Blob> {
    return this.http.get(`${this.base}/photo`, { responseType: 'blob' });
  }
}
