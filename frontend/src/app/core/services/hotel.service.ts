import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { HotelResponseDto, SearchHotelResultDto, SearchRequestParams } from '../models/hotel.model';

@Injectable({ providedIn: 'root' })
export class HotelService {
  private readonly apiUrl = `${environment.apiUrl}/hotels`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ApiResponse<HotelResponseDto[]>> {
    return this.http.get<ApiResponse<HotelResponseDto[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<HotelResponseDto>> {
    return this.http.get<ApiResponse<HotelResponseDto>>(`${this.apiUrl}/${id}`);
  }

  search(params: SearchRequestParams): Observable<ApiResponse<SearchHotelResultDto[]>> {
    let httpParams = new HttpParams()
      .set('destinationCity', params.destinationCity)
      .set('checkInDate', params.checkInDate)
      .set('checkOutDate', params.checkOutDate)
      .set('guests', params.guests);

    if (params.pageNumber) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);

    return this.http.get<ApiResponse<SearchHotelResultDto[]>>(`${this.apiUrl}/search`, { params: httpParams });
  }
}
