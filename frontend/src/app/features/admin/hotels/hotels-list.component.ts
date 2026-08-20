import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelRequestDto, HotelResponseDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';

interface HotelRow {
  id: string;
  name: string;
  branch?: string;
  city?: string;
  location?: string;
  managerId?: string;
  manager?: string;
  status: string;
  raw: HotelResponseDto;
}

/**
 * Wired to the real backend: GET/PUT api/hotels (Features/Hotels/Controllers/HotelsController.cs).
 * The backend has no "Pending hotel approval" or "manager list per hotel" concept, so those parts
 * of the original mock UI (approve action, manager name) are neutralized rather than faked:
 * kpiPending is always 0, the Approve button never renders, and managerNameFor always shows
 * "Unassigned" since HotelResponseDto carries no manager info.
 */
@Component({
  selector: 'app-hotels-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './hotels-list.component.html',
  styleUrls: ['./hotels-list.component.scss']
})
export class HotelsListComponent {
  private readonly http = inject(HttpClient);
  private readonly ui = inject(GlobalUiService);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/hotels`;

  searchTerm = signal('');
  cityFilter = signal('all');
  statusFilter = signal('all');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  confirmMessage = signal('');
  private confirmAction: (() => void) | null = null;
  showConfirmModal = signal(false);

  private hotelRows = signal<HotelRow[]>([]);
  private roomCounts = signal<Record<string, number>>({});

  constructor() {
    this.loadHotels();
  }

  private loadHotels(): void {
    this.http.get<ApiResponse<HotelResponseDto[]>>(this.base).subscribe({
      next: res => {
        const list = res.data || [];
        this.hotelRows.set(list.map(h => this.toRow(h)));
        this.loadRoomCounts(list);
      },
      error: () => this.ui.showToast('Failed to load hotels from server.')
    });
  }

  private loadRoomCounts(list: HotelResponseDto[]): void {
    if (list.length === 0) return;
    const calls = list.map(h =>
      this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/${h.id}/roomtypes`).pipe(
        catchError(() => of({ success: false, message: '', data: [] as RoomTypeResponseDto[], errors: [] }))
      )
    );
    forkJoin(calls).subscribe(results => {
      const counts: Record<string, number> = {};
      list.forEach((h, i) => {
        counts[String(h.id)] = (results[i].data || []).reduce((sum, rt) => sum + (rt.totalRooms || 0), 0);
      });
      this.roomCounts.set(counts);
    });
  }

  private toRow(h: HotelResponseDto): HotelRow {
    return {
      id: String(h.id),
      name: h.name,
      branch: h.location,
      city: h.city,
      location: h.location,
      manager: 'Unassigned',
      status: h.isActive ? 'Active' : 'Inactive',
      raw: h
    };
  }

  get hotels(): HotelRow[] {
    return this.hotelRows();
  }

  get kpiTotal(): number { return this.hotels.length; }

  get kpiRooms(): number {
    const counts = this.roomCounts();
    return Object.values(counts).reduce((acc, n) => acc + n, 0);
  }

  get kpiActive(): number { return this.hotels.filter(h => h.status === 'Active').length; }
  get kpiPending(): number { return 0; }

  private decorated(): (HotelRow & { city: string; branch: string })[] {
    return this.hotels.map(h => {
      const cityName = h.city || 'Unknown';
      const branchName = h.branch || (h.name ? h.name.replace('Elegant Enclave ', '') + ' Branch' : 'Main');
      return { ...h, city: cityName, branch: branchName };
    });
  }

  filteredHotels = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    const cityVal = this.cityFilter();
    const statusVal = this.statusFilter();

    return this.decorated().filter(h => {
      const managerText = h.manager || h.managerId || '';
      if (q && !h.name.toLowerCase().includes(q) && !h.id.toLowerCase().includes(q) && !h.city.toLowerCase().includes(q) && !managerText.toLowerCase().includes(q)) return false;
      if (cityVal !== 'all' && h.city !== cityVal) return false;
      if (statusVal !== 'all' && h.status !== statusVal) return false;
      return true;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredHotels().length / this.rowsPerPage())));

  pagedHotels = computed(() => {
    const filtered = this.filteredHotels();
    let page = this.currentPage();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.rowsPerPage()));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    const start = (page - 1) * this.rowsPerPage();
    return filtered.slice(start, start + this.rowsPerPage());
  });

  paginationInfo = computed(() => {
    const total = this.filteredHotels().length;
    if (total === 0) return 'Showing 0 entries';
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.rowsPerPage() + 1;
    const end = Math.min(start + this.rowsPerPage() - 1, total);
    return `Showing ${start} to ${end} of ${total} entries`;
  });

  pageNumbers = computed(() => {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) pages.push(i);
    return pages;
  });

  roomCountFor(hotelId: string): number {
    return this.roomCounts()[hotelId] || 0;
  }

  managerNameFor(_h: HotelRow): string {
    return 'Unassigned';
  }

  applyFilters(): void { this.currentPage.set(1); }

  resetFilters(): void {
    this.searchTerm.set('');
    this.cityFilter.set('all');
    this.statusFilter.set('all');
    this.currentPage.set(1);
  }

  onSearchInput(): void { this.currentPage.set(1); }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  onPageSizeChange(size: string): void {
    this.rowsPerPage.set(parseInt(size, 10));
    this.currentPage.set(1);
  }

  navigateToAdd(): void { this.router.navigate(['/admin/hotels/add']); }
  navigateToView(id: string): void { this.router.navigate(['/admin/hotels', id]); }
  navigateToEdit(id: string): void { this.router.navigate(['/admin/hotels', id, 'edit']); }

  private askConfirm(message: string, action: () => void): void {
    this.confirmMessage.set(message);
    this.confirmAction = action;
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.confirmAction = null;
  }

  runConfirmedAction(): void {
    if (this.confirmAction) {
      this.confirmAction();
      this.confirmAction = null;
    }
    this.showConfirmModal.set(false);
  }

  /** No backend "Pending" state exists, so this button never renders — kept only for structural parity. */
  approveHotel(_id: string): void {}

  private setActive(row: HotelRow, isActive: boolean, successMessage: string): void {
    const h = row.raw;
    const body: HotelRequestDto = {
      name: h.name,
      description: h.description,
      location: h.location,
      city: h.city,
      state: h.state,
      country: h.country,
      zipCode: h.zipCode,
      starRating: h.starRating,
      isActive,
      rowVersion: h.rowVersion
    };
    this.http.put<ApiResponse<HotelResponseDto>>(`${this.base}/${h.id}`, body).subscribe({
      next: () => {
        this.ui.showToast(successMessage);
        this.loadHotels();
      },
      error: () => this.ui.showToast('Failed to update hotel status.')
    });
  }

  deactivateHotel(id: string): void {
    const row = this.hotels.find(h => h.id === id);
    if (!row) return;
    this.askConfirm('Deactivate Hotel? The hotel branch will become unavailable for new room bookings.', () => {
      this.setActive(row, false, 'Hotel deactivated successfully.');
    });
  }

  activateHotel(id: string): void {
    const row = this.hotels.find(h => h.id === id);
    if (!row) return;
    this.askConfirm('Activate Hotel? The hotel branch will become available for room bookings.', () => {
      this.setActive(row, true, 'Hotel activated successfully.');
    });
  }
}
