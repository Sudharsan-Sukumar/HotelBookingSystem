import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AboutContentResponseDto, ContactContentResponseDto, HeroContentResponseDto } from '../models/content.model';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly apiUrl = `${environment.apiUrl}/content`;

  constructor(private readonly http: HttpClient) {}

  getHero(): Observable<ApiResponse<HeroContentResponseDto>> {
    return this.http.get<ApiResponse<HeroContentResponseDto>>(`${this.apiUrl}/hero`);
  }

  getAbout(): Observable<ApiResponse<AboutContentResponseDto>> {
    return this.http.get<ApiResponse<AboutContentResponseDto>>(`${this.apiUrl}/about`);
  }

  getContact(): Observable<ApiResponse<ContactContentResponseDto>> {
    return this.http.get<ApiResponse<ContactContentResponseDto>>(`${this.apiUrl}/contact`);
  }
}
