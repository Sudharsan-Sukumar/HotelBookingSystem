import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto, RoomTypeRequestDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';

/**
 * Ported from rooms.html + rooms_all.js.
 *
 * BACKEND LIMITATION: the API has no concept of individual physical room instances with a
 * status (Available/Occupied/Cleaning/Maintenance) that the old mock modeled -- it only exposes
 * an aggregate RoomType (name, basePrice, capacity, totalRooms, isActive, isUnderMaintenance).
 * This page is therefore rewired as a room-type inventory overview: KPIs and cards are built
 * from real RoomTypeResponseDto records for the manager's hotel, not fabricated per-room tiles.
 */
@Component({
  selector: 'app-manager-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Rooms</li>
        </ol>
      </nav>

      @if (loading()) {
        <div class="text-center text-muted py-5"><div class="spinner-border text-purple"></div></div>
      } @else if (!hotel()) {
        <div class="card border shadow-sm bg-white p-5 text-center" style="border-radius:12px;">
          <i class="bi bi-building-x fs-1 text-muted mb-2"></i>
          <h5 class="fw-bold text-purple">No hotel assigned</h5>
          <p class="text-secondary small mb-0">We couldn't verify a hotel managed by your account. Contact an administrator.</p>
        </div>
      } @else {
        <div class="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row gap-3 mb-4 text-start">
          <div>
            <h1 class="font-serif fw-bold text-purple h2 mb-1">Room Management</h1>
            <p class="text-secondary small mb-0">Master inventory control registry for {{ hotel()?.name }}.</p>
          </div>
          <button class="btn btn-purple btn-sm d-flex align-items-center gap-2 px-4 py-2" (click)="showAddForm.set(!showAddForm())"
                  style="border-radius:8px;">
            <i class="bi bi-plus-lg"></i> Add Room Type
          </button>
        </div>

        <div class="row g-3 mb-4 text-start">
          <div class="col-6 col-md-4 col-lg-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Room Types</span><strong class="fs-5 text-dark">{{ roomTypes().length }}</strong></div></div>
          <div class="col-6 col-md-4 col-lg-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Total Rooms</span><strong class="fs-5 text-dark">{{ totalRoomCount() }}</strong></div></div>
          <div class="col-6 col-md-4 col-lg-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Active Types</span><strong class="fs-5 text-dark">{{ activeCount() }}</strong></div></div>
          <div class="col-6 col-md-4 col-lg-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Under Maintenance</span><strong class="fs-5 text-dark">{{ maintenanceCount() }}</strong></div></div>
        </div>

        <div class="card p-3 border mb-4 bg-white shadow-sm" style="border-radius:12px;">
          <div class="row g-2 align-items-end text-start">
            <div class="col-md-6">
              <label class="form-label small fw-semibold text-purple">Search Room Type</label>
              <input type="text" class="form-control form-control-sm" placeholder="Name, description..." [(ngModel)]="search">
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold text-purple">Status</label>
              <select class="form-select form-select-sm" [(ngModel)]="statusFilter">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>
            <div class="col-md-3">
              <button class="btn btn-purple btn-sm w-100" (click)="resetFilters()">Reset Filters</button>
            </div>
          </div>
        </div>

        @if (showAddForm()) {
          <div class="card border shadow-sm bg-white p-3 mb-4" style="border-radius:12px;">
            <h6 class="fw-bold text-purple mb-3">Register New Room Type</h6>
            <div class="row g-2">
              <div class="col-md-3"><input class="form-control form-control-sm" placeholder="Name" [(ngModel)]="newRoomType.name"></div>
              <div class="col-md-3"><input class="form-control form-control-sm" placeholder="Description" [(ngModel)]="newRoomType.description"></div>
              <div class="col-md-2"><input type="number" min="0" class="form-control form-control-sm" placeholder="Base Price" [(ngModel)]="newRoomType.basePrice"></div>
              <div class="col-md-2"><input type="number" min="1" class="form-control form-control-sm" placeholder="Capacity" [(ngModel)]="newRoomType.capacity"></div>
              <div class="col-md-1"><input type="number" min="1" class="form-control form-control-sm" placeholder="Rooms" [(ngModel)]="newRoomType.totalRooms"></div>
              <div class="col-md-1"><button class="btn btn-purple btn-sm w-100" (click)="addRoomType()" [disabled]="saving()">Save</button></div>
            </div>
          </div>
        }

        <div class="card border shadow-sm bg-white p-4 mb-4 text-start" style="border-radius:12px;">
          <div class="row g-3">
            @for (rt of visibleRoomTypes(); track rt.id) {
              <div class="col-6 col-md-4 col-lg-3">
                <div class="card border shadow-sm p-3 d-flex flex-column align-items-center justify-content-center text-center" style="border-radius:12px;">
                  <h5 class="fw-bold mb-1 text-dark">{{ rt.name }}</h5>
                  <span class="text-muted small mb-1">₹{{ rt.basePrice | number:'1.0-0' }} / night · {{ rt.totalRooms }} rooms · cap {{ rt.capacity }}</span>
                  <span class="badge text-uppercase mb-2" [ngClass]="rt.isUnderMaintenance ? 'bg-secondary' : (rt.isActive ? 'bg-success' : 'bg-danger')" style="font-size:0.65rem;">
                    {{ rt.isUnderMaintenance ? 'Maintenance' : (rt.isActive ? 'Active' : 'Inactive') }}
                  </span>
                  <button class="btn btn-outline-purple btn-sm w-100" (click)="deleteRoomType(rt)">
                    <i class="bi bi-trash"></i> Deactivate/Delete
                  </button>
                </div>
              </div>
            } @empty {
              <div class="w-100 text-center text-muted py-5">
                <i class="bi bi-door-closed fs-1 d-block mb-2"></i>No room types found for this property.
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class RoomsComponent implements OnInit {
  private readonly base = environment.apiUrl;

  readonly loading = signal(true);
  readonly hotel = signal<HotelResponseDto | null>(null);
  readonly roomTypes = signal<RoomTypeResponseDto[]>([]);
  readonly showAddForm = signal(false);
  readonly saving = signal(false);

  search = '';
  statusFilter = 'all';
  newRoomType: RoomTypeRequestDto = { name: '', description: '', basePrice: 0, capacity: 2, totalRooms: 1 };

  constructor(
    private http: HttpClient,
    private scope: ManagerHotelScopeService,
    private globalUi: GlobalUiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const hotel = await this.scope.getPrimaryHotel();
    this.hotel.set(hotel);
    if (hotel) {
      await this.loadRoomTypes(hotel.id);
    }
    this.loading.set(false);
  }

  private async loadRoomTypes(hotelId: number): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/hotels/${hotelId}/roomtypes`)
      );
      this.roomTypes.set(res.data ?? []);
    } catch {
      this.roomTypes.set([]);
    }
  }

  totalRoomCount(): number {
    return this.roomTypes().reduce((sum, rt) => sum + (rt.totalRooms || 0), 0);
  }

  activeCount(): number {
    return this.roomTypes().filter(rt => rt.isActive).length;
  }

  maintenanceCount(): number {
    return this.roomTypes().filter(rt => rt.isUnderMaintenance).length;
  }

  visibleRoomTypes(): RoomTypeResponseDto[] {
    let list = this.roomTypes();
    const q = this.search.trim().toLowerCase();
    if (q) list = list.filter(rt => rt.name.toLowerCase().includes(q) || (rt.description || '').toLowerCase().includes(q));
    if (this.statusFilter === 'active') list = list.filter(rt => rt.isActive && !rt.isUnderMaintenance);
    else if (this.statusFilter === 'inactive') list = list.filter(rt => !rt.isActive);
    else if (this.statusFilter === 'maintenance') list = list.filter(rt => rt.isUnderMaintenance);
    return list;
  };

  resetFilters(): void {
    this.search = '';
    this.statusFilter = 'all';
  }

  async addRoomType(): Promise<void> {
    const hotel = this.hotel();
    if (!hotel || !this.newRoomType.name.trim()) return;
    this.saving.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<RoomTypeResponseDto>>(`${this.base}/hotels/${hotel.id}/roomtypes`, {
          ...this.newRoomType,
          basePrice: Number(this.newRoomType.basePrice) || 0,
          capacity: Number(this.newRoomType.capacity) || 1,
          totalRooms: Number(this.newRoomType.totalRooms) || 1
        })
      );
      if (res.data) this.roomTypes.set([...this.roomTypes(), res.data]);
      this.newRoomType = { name: '', description: '', basePrice: 0, capacity: 2, totalRooms: 1 };
      this.showAddForm.set(false);
      this.globalUi.showToast('New room type registered.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to create room type.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRoomType(rt: RoomTypeResponseDto): Promise<void> {
    const hotel = this.hotel();
    if (!hotel) return;
    try {
      await firstValueFrom(this.http.delete<ApiResponse<null>>(`${this.base}/hotels/${hotel.id}/roomtypes/${rt.id}`));
      this.roomTypes.set(this.roomTypes().filter(x => x.id !== rt.id));
      this.globalUi.showToast(`${rt.name} deleted.`);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      if (httpErr.status === 409) {
        this.globalUi.showToast(httpErr.error?.message || 'This room type cannot be deleted. Deactivate it instead.');
      } else {
        this.globalUi.showToast(httpErr.error?.message || 'Failed to delete room type.');
      }
    }
  }
}
