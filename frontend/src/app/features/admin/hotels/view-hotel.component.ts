import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';

/**
 * Wired to GET api/hotels/{id} and GET api/hotels/{id}/roomtypes (both public reads).
 * The backend has no per-room-instance occupancy/booking-revenue data reachable from this
 * scope, so occupancy/revenue/manager KPIs that the original mock computed from local
 * bookings/rooms state are shown as "Not available" rather than fabricated.
 */
@Component({
  selector: 'app-view-hotel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './view-hotel.component.html',
  styleUrls: ['./view-hotel.component.scss']
})
export class ViewHotelComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/hotels`;

  hotel: any = null;
  notFound = false;

  typeCurrentPage = signal(1);
  typeRowsPerPage = signal(10);

  private roomTypesList = signal<RoomTypeResponseDto[]>([]);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      return;
    }
    this.http.get<ApiResponse<HotelResponseDto>>(`${this.base}/${id}`).subscribe({
      next: res => {
        this.hotel = {
          id: String(res.data.id),
          name: res.data.name,
          city: res.data.city,
          address: res.data.location,
          status: res.data.isActive ? 'Active' : 'Inactive',
          rating: res.data.starRating
        };
        this.loadRoomTypes(res.data.id);
      },
      error: () => { this.notFound = true; }
    });
  }

  private loadRoomTypes(hotelId: number): void {
    this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/${hotelId}/roomtypes`).subscribe({
      next: res => this.roomTypesList.set(res.data || []),
      error: () => this.roomTypesList.set([])
    });
  }

  get totalRooms(): number {
    return this.roomTypesList().reduce((acc, rt) => acc + (rt.totalRooms || 0), 0);
  }

  /** No per-room occupancy data is exposed to this endpoint; treat non-maintenance rooms as active. */
  get activeRooms(): number {
    return this.roomTypesList().filter(rt => !rt.isUnderMaintenance).reduce((acc, rt) => acc + rt.totalRooms, 0);
  }

  get disabledRooms(): number {
    return this.roomTypesList().filter(rt => rt.isUnderMaintenance).reduce((acc, rt) => acc + rt.totalRooms, 0);
  }

  /** Occupied-room and revenue figures require booking data not reachable from the Admin hotels scope. */
  get occupiedRooms(): number { return 0; }
  get occupancyRate(): number { return 0; }
  get managerName(): string { return 'Not available'; }
  get monthlyRevenue(): string { return 'Not available'; }
  get monthlyBookingsCount(): number | string { return 'Not available'; }

  roomTypes = computed(() => this.roomTypesList());

  typeTotalPages = computed(() => Math.max(1, Math.ceil(this.roomTypes().length / this.typeRowsPerPage())));

  pagedRoomTypes = computed(() => {
    const types = this.roomTypes();
    let page = this.typeCurrentPage();
    const totalPages = Math.max(1, Math.ceil(types.length / this.typeRowsPerPage()));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    const start = (page - 1) * this.typeRowsPerPage();
    return types.slice(start, start + this.typeRowsPerPage());
  });

  typePaginationInfo = computed(() => {
    const total = this.roomTypes().length;
    if (total === 0) return 'Showing 0 entries';
    const page = Math.min(this.typeCurrentPage(), this.typeTotalPages());
    const start = (page - 1) * this.typeRowsPerPage() + 1;
    const end = Math.min(start + this.typeRowsPerPage() - 1, total);
    return `Showing ${start} to ${end} of ${total} entries`;
  });

  typePageNumbers = computed(() => {
    const pages: number[] = [];
    for (let i = 1; i <= this.typeTotalPages(); i++) pages.push(i);
    return pages;
  });

  typeCountFor(rt: RoomTypeResponseDto): number { return rt.totalRooms; }
  typeOccupiedFor(_rt: RoomTypeResponseDto): number { return 0; }
  typeAvailableFor(rt: RoomTypeResponseDto): number { return rt.totalRooms; }
  typeBasePrice(rt: RoomTypeResponseDto): string { return rt.basePrice.toLocaleString('en-IN'); }

  onTypeRowsChange(size: string): void {
    this.typeRowsPerPage.set(parseInt(size, 10));
    this.typeCurrentPage.set(1);
  }

  goToTypePage(page: number): void {
    if (page < 1 || page > this.typeTotalPages()) return;
    this.typeCurrentPage.set(page);
  }

  back(): void { this.router.navigate(['/admin/hotels']); }

  editHotel(): void { this.router.navigate(['/admin/hotels', this.hotel.id, 'edit']); }
}
