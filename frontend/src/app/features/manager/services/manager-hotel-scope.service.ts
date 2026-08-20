import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto } from '../../../core/models/hotel.model';

/**
 * Determines which hotel(s) the logged-in Manager actually manages.
 *
 * Backed by `GET /api/hotels/my` ([Authorize(Roles="Manager")]), which returns exactly the
 * hotels owned by the calling manager. Result is cached for the session since a manager's
 * hotel assignment doesn't change while they're logged in.
 */
@Injectable({ providedIn: 'root' })
export class ManagerHotelScopeService {
  private readonly base = environment.apiUrl;
  private cache: Promise<HotelResponseDto[]> | null = null;

  constructor(private http: HttpClient) {}

  /** Resolves to the list of hotels this manager is actually assigned to (verified server-side). */
  getManagedHotels(): Promise<HotelResponseDto[]> {
    if (!this.cache) {
      this.cache = this.resolveManagedHotels();
    }
    return this.cache;
  }

  /** Convenience: the single primary managed hotel, or null if the manager manages none (or many). */
  async getPrimaryHotel(): Promise<HotelResponseDto | null> {
    const hotels = await this.getManagedHotels();
    return hotels.length > 0 ? hotels[0] : null;
  }

  clearCache(): void {
    this.cache = null;
  }

  private async resolveManagedHotels(): Promise<HotelResponseDto[]> {
    return firstValueFrom(
      this.http.get<ApiResponse<HotelResponseDto[]>>(`${this.base}/hotels/my`)
    ).then(res => res.data ?? []).catch(() => [] as HotelResponseDto[]);
  }
}
