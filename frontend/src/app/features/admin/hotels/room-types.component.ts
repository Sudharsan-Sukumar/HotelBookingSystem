import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';

interface RoomTypeRow {
  id: string;
  name: string;
  maxCapacity: number;
  basePrice: number;
  totalUnits: number;
  propertiesCount: number;
  branches: string[];
  status: 'Active' | 'Disabled';
  hotelName: string;
}

/**
 * Read-only, cross-hotel view for Admin.
 *
 * Room types belong to a single hotel on the backend (route api/hotels/{hotelId}/roomtypes) and
 * create/update/delete on that controller are [Authorize(Roles = "Manager")] with an ownership
 * check in the service layer — verified live: an Admin JWT against
 * POST api/hotels/1/roomtypes returns 403 Forbidden. So this page can only ever read
 * (GET is anonymous/public) and never mutate. It fetches every hotel, then that hotel's room
 * types, and flattens them into one table so Admin gets a global view. The Add/Edit/Disable
 * controls from the original mock page are hidden (never rendered) rather than removed from the
 * template — see room-types.component.html.
 */
@Component({
  selector: 'app-room-types',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './room-types.component.html',
  styleUrls: ['./room-types.component.scss']
})
export class RoomTypesComponent {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/hotels`;

  readonly amenityOptions: string[] = [];

  searchTerm = signal('');
  statusFilter = signal('all');
  branchFilter = signal('all');
  currentPage = signal(1);
  rowsPerPage = signal(5);

  showAddModal = signal(false);
  showEditModal = signal(false);
  showConfirmModal = signal(false);
  confirmMessage = signal('');

  private allRows = signal<RoomTypeRow[]>([]);

  constructor() {
    this.loadAll();
  }

  private loadAll(): void {
    this.http.get<ApiResponse<HotelResponseDto[]>>(this.base).subscribe({
      next: res => {
        const hotels = res.data || [];
        if (hotels.length === 0) { this.allRows.set([]); return; }
        const calls = hotels.map(h =>
          this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/${h.id}/roomtypes`).pipe(
            catchError(() => of({ success: false, message: '', data: [] as RoomTypeResponseDto[], errors: [] }))
          )
        );
        forkJoin(calls).subscribe(results => {
          const rows: RoomTypeRow[] = [];
          hotels.forEach((h, i) => {
            (results[i].data || []).forEach(rt => {
              rows.push({
                id: `RT-${rt.id}`,
                name: rt.name,
                maxCapacity: rt.capacity,
                basePrice: rt.basePrice,
                totalUnits: rt.totalRooms,
                propertiesCount: 1,
                branches: [h.city],
                status: (rt.isActive && !rt.isUnderMaintenance) ? 'Active' : 'Disabled',
                hotelName: h.name
              });
            });
          });
          this.allRows.set(rows);
        });
      },
      error: () => this.allRows.set([])
    });
  }

  get roomTypes(): RoomTypeRow[] {
    return this.allRows();
  }

  get kpiTotalTypes(): number { return this.roomTypes.length; }
  get kpiCapacity(): number { return this.roomTypes.reduce((acc, x) => acc + x.maxCapacity, 0); }
  get kpiUnits(): number { return this.roomTypes.reduce((acc, x) => acc + x.totalUnits, 0); }
  get kpiAvgPrice(): number {
    return Math.round(this.roomTypes.reduce((acc, x) => acc + x.basePrice, 0) / (this.roomTypes.length || 1));
  }

  filteredTypes = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    const statusVal = this.statusFilter();
    const branchVal = this.branchFilter();

    return this.roomTypes.filter(rt => {
      if (q && !rt.name.toLowerCase().includes(q) && !rt.id.toLowerCase().includes(q) && !rt.hotelName.toLowerCase().includes(q)) return false;
      if (statusVal !== 'all' && rt.status !== statusVal) return false;
      if (branchVal !== 'all') {
        const branches = rt.branches || [];
        if (!branches.includes(branchVal)) return false;
      }
      return true;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTypes().length / this.rowsPerPage())));

  pagedTypes = computed(() => {
    const filtered = this.filteredTypes();
    let page = this.currentPage();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.rowsPerPage()));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    const start = (page - 1) * this.rowsPerPage();
    return filtered.slice(start, start + this.rowsPerPage());
  });

  paginationInfo = computed(() => {
    const total = this.filteredTypes().length;
    if (total === 0) return 'Showing 0 to 0 of 0 entries';
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

  unitLabel(rt: RoomTypeRow): string {
    return rt.totalUnits > 0 ? `${rt.totalUnits} (${rt.hotelName})` : '0 (Inactive)';
  }

  applyFilters(): void { this.currentPage.set(1); }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.branchFilter.set('all');
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

  // Add/Edit/Disable were Manager-only mutations (confirmed via [Authorize(Roles = "Manager")] on
  // RoomTypesController + a live 403 against POST with an Admin token). Their UI entry points are
  // hidden in the template; these handlers are intentionally no-ops kept only so the (unused)
  // modal markup below still type-checks.
  toggleAmenity(_list: 'add' | 'edit', _amenity: string): void {}
  isAmenitySelected(_list: 'add' | 'edit', _amenity: string): boolean { return false; }
  openAddModal(): void {}
  closeAddModal(): void { this.showAddModal.set(false); }
  submitAdd(): void {}
  openEditModal(_id: string): void {}
  closeEditModal(): void { this.showEditModal.set(false); }
  onEditPriceChange(): void {}
  submitEdit(): void {}
  closeConfirmModal(): void { this.showConfirmModal.set(false); }
  runConfirmedAction(): void { this.showConfirmModal.set(false); }
  toggleStatus(_id: string, _newStatus: 'Active' | 'Disabled'): void {}
  disableFromEditModal(): void {}

  addForm = { name: '', maxCapacity: null, maxAdults: null, maxChildren: null, status: 'Active', basePrice: null, weekendPrice: null, holidayPrice: null, beds: '' };
  editForm = { id: '', name: '', maxCapacity: 0, maxAdults: 0, maxChildren: 0, status: 'Active', basePrice: 0, beds: '', description: '', roomSize: 0, displayOrder: 1 };
  priceChanged = signal(false);
}
