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
import {
  BlockedDateRequestDto,
  BlockedDateResponseDto,
  HotelResponseDto,
  PricingOverrideRequestDto,
  RoomTypeResponseDto
} from '../../../core/models/hotel.model';
import { HotelImageResponseDto, PricingOverrideDto, RoomTypeImageDto } from '../../../core/models/manager.model';

/**
 * Room Types catalogue/management page. Rewired from HotelStateService mocks to the real
 * RoomTypesController, BlockedDatesController, PricingOverridesController and GalleriesController.
 */
@Component({
  selector: 'app-manager-room-types',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Room Types</li>
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
        <h1 class="font-serif fw-bold text-purple h2 mb-1">Room Types</h1>
        <p class="text-secondary small mb-4">Category catalogue for {{ hotel()?.name }}.</p>

        <div class="row g-3">
          @for (rt of roomTypes(); track rt.id) {
            <div class="col-12">
              <div class="card border shadow-sm p-3" style="border-radius:12px;">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <h5 class="fw-bold text-purple mb-1">{{ rt.name }}
                      @if (rt.isUnderMaintenance) {
                        <span class="badge bg-secondary text-uppercase ms-2" style="font-size:0.6rem;">Under Maintenance</span>
                      }
                      @if (!rt.isActive) {
                        <span class="badge bg-danger text-uppercase ms-2" style="font-size:0.6rem;">Inactive</span>
                      }
                    </h5>
                    <p class="text-muted small mb-1">{{ rt.description }}</p>
                    <p class="text-muted small mb-1">{{ rt.totalRooms }} rooms · capacity {{ rt.capacity }}</p>
                    <p class="fw-bold text-dark mb-0">₹{{ rt.basePrice | number:'1.0-0' }} / night</p>
                  </div>
                  <div class="d-flex flex-column gap-2 align-items-end">
                    <button class="btn btn-sm" [ngClass]="rt.isUnderMaintenance ? 'btn-purple' : 'btn-outline-purple'"
                            (click)="toggleMaintenance(rt)">
                      {{ rt.isUnderMaintenance ? 'Clear Maintenance' : 'Mark Under Maintenance' }}
                    </button>
                    <button class="btn btn-outline-purple btn-sm" (click)="toggleExpand(rt.id)">
                      {{ expandedId() === rt.id ? 'Hide Details' : 'Manage Blocked Dates / Pricing / Gallery' }}
                    </button>
                  </div>
                </div>

                @if (expandedId() === rt.id) {
                  <hr>
                  <div class="row g-3 text-start">
                    <!-- Blocked Dates -->
                    <div class="col-md-4">
                      <h6 class="fw-bold text-purple small">Blocked Dates</h6>
                      <div class="d-flex flex-column gap-1 mb-2">
                        <input type="date" class="form-control form-control-sm" [(ngModel)]="blockForm.startDate">
                        <input type="date" class="form-control form-control-sm" [(ngModel)]="blockForm.endDate">
                        <input type="text" class="form-control form-control-sm" placeholder="Reason" [(ngModel)]="blockForm.reason">
                        <button class="btn btn-purple btn-sm" (click)="addBlockedDate(rt.id)">Add Block</button>
                      </div>
                      <ul class="list-unstyled small mb-0" style="max-height:180px;overflow-y:auto;">
                        @for (bd of blockedDates(); track bd.id) {
                          <li class="d-flex justify-content-between align-items-center border-bottom py-1">
                            <span>{{ bd.startDate | date:'mediumDate' }} – {{ bd.endDate | date:'mediumDate' }}<br><span class="text-muted">{{ bd.reason }}</span></span>
                            <button class="btn btn-sm btn-outline-danger" (click)="deleteBlockedDate(bd.id)"><i class="bi bi-trash"></i></button>
                          </li>
                        } @empty {
                          <li class="text-muted">No blocked dates.</li>
                        }
                      </ul>
                    </div>

                    <!-- Pricing Overrides -->
                    <div class="col-md-4">
                      <h6 class="fw-bold text-purple small">Seasonal Pricing</h6>
                      <div class="d-flex flex-column gap-1 mb-2">
                        <input type="date" class="form-control form-control-sm" [(ngModel)]="pricingForm.startDate">
                        <input type="date" class="form-control form-control-sm" [(ngModel)]="pricingForm.endDate">
                        <input type="number" min="0" class="form-control form-control-sm" placeholder="Override Price" [(ngModel)]="pricingForm.price">
                        <button class="btn btn-purple btn-sm" (click)="addPricingOverride(rt.id)">Add Override</button>
                      </div>
                      <ul class="list-unstyled small mb-0" style="max-height:180px;overflow-y:auto;">
                        @for (po of pricingOverrides(); track po.id) {
                          <li class="d-flex justify-content-between align-items-center border-bottom py-1">
                            <span>{{ po.startDate | date:'mediumDate' }} – {{ po.endDate | date:'mediumDate' }}<br>₹{{ po.price | number:'1.0-0' }} {{ po.isActive ? '' : '(inactive)' }}</span>
                            <button class="btn btn-sm btn-outline-danger" (click)="deletePricingOverride(po.id)"><i class="bi bi-trash"></i></button>
                          </li>
                        } @empty {
                          <li class="text-muted">No pricing overrides.</li>
                        }
                      </ul>
                    </div>

                    <!-- Gallery -->
                    <div class="col-md-4">
                      <h6 class="fw-bold text-purple small">Image Gallery</h6>
                      <input type="file" accept="image/*" class="form-control form-control-sm mb-2" (change)="onGalleryFileSelected($event, rt.id)">
                      <div class="d-flex flex-wrap gap-2 mb-2" style="max-height:180px;overflow-y:auto;">
                        @for (img of roomTypeImages(); track img.id) {
                          <div class="position-relative">
                            <img [src]="resolveImageUrl(img.url)" style="width:64px;height:64px;object-fit:cover;border-radius:8px;" alt="Room image">
                            <button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 p-0 px-1"
                                    (click)="deleteRoomTypeImage(img.id)">&times;</button>
                          </div>
                        } @empty {
                          <span class="text-muted small">No images yet.</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="col-12 text-center text-muted py-5">No room types configured.</div>
          }
        </div>

        <!-- Hotel-level gallery (compact) -->
        <div class="card border shadow-sm p-3 mt-4" style="border-radius:12px;">
          <h6 class="fw-bold text-purple small mb-2">Hotel Gallery</h6>
          <input type="file" accept="image/*" class="form-control form-control-sm mb-2" style="max-width:300px;" (change)="onHotelFileSelected($event)">
          <div class="d-flex flex-wrap gap-2">
            @for (img of hotelImages(); track img.id) {
              <div class="position-relative">
                <img [src]="resolveImageUrl(img.url)" style="width:72px;height:72px;object-fit:cover;border-radius:8px;" alt="Hotel image">
                <button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 p-0 px-1"
                        (click)="deleteHotelImage(img.id)">&times;</button>
              </div>
            } @empty {
              <span class="text-muted small">No hotel images yet.</span>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class RoomTypesComponent implements OnInit {
  private readonly base = environment.apiUrl;
  private readonly origin = environment.apiUrl.replace(/\/api\/?$/, '');

  // Gallery/room-type images come back from the backend as a server-relative path
  // (e.g. "/images/xyz.jpg", served by the API host, not by the Angular dev server),
  // so a bare [src]="img.url" 404s against localhost:4200. Absolute URLs pass through untouched.
  resolveImageUrl(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `${this.origin}${url}`;
  }

  readonly loading = signal(true);
  readonly hotel = signal<HotelResponseDto | null>(null);
  readonly roomTypes = signal<RoomTypeResponseDto[]>([]);
  readonly expandedId = signal<number | null>(null);

  readonly blockedDates = signal<BlockedDateResponseDto[]>([]);
  readonly pricingOverrides = signal<PricingOverrideDto[]>([]);
  readonly roomTypeImages = signal<RoomTypeImageDto[]>([]);
  readonly hotelImages = signal<HotelImageResponseDto[]>([]);

  blockForm: { startDate: string; endDate: string; reason: string } = { startDate: '', endDate: '', reason: '' };
  pricingForm: { startDate: string; endDate: string; price: number | null } = { startDate: '', endDate: '', price: null };

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
      await this.loadHotelImages(hotel.id);
    }
    this.loading.set(false);
  }

  private async loadRoomTypes(hotelId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/hotels/${hotelId}/roomtypes`));
      this.roomTypes.set(res.data ?? []);
    } catch {
      this.roomTypes.set([]);
    }
  }

  async toggleMaintenance(rt: RoomTypeResponseDto): Promise<void> {
    const hotel = this.hotel();
    if (!hotel) return;
    try {
      const res = await firstValueFrom(
        this.http.patch<ApiResponse<RoomTypeResponseDto>>(
          `${this.base}/hotels/${hotel.id}/roomtypes/${rt.id}/maintenance`,
          { isUnderMaintenance: !rt.isUnderMaintenance }
        )
      );
      if (res.data) {
        this.roomTypes.set(this.roomTypes().map(x => x.id === rt.id ? res.data : x));
      }
      this.globalUi.showToast('Maintenance status updated.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to update maintenance status.');
    }
  }

  async toggleExpand(id: number): Promise<void> {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(id);
    this.blockForm = { startDate: '', endDate: '', reason: '' };
    this.pricingForm = { startDate: '', endDate: '', price: null };
    await Promise.all([this.loadBlockedDates(id), this.loadPricingOverrides(id), this.loadRoomTypeImages(id)]);
  }

  private async loadBlockedDates(roomTypeId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<BlockedDateResponseDto[]>>(`${this.base}/blockeddates/${roomTypeId}`));
      this.blockedDates.set(res.data ?? []);
    } catch {
      this.blockedDates.set([]);
    }
  }

  private async loadPricingOverrides(roomTypeId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<PricingOverrideDto[]>>(`${this.base}/pricingoverrides/${roomTypeId}`));
      this.pricingOverrides.set(res.data ?? []);
    } catch {
      this.pricingOverrides.set([]);
    }
  }

  private async loadRoomTypeImages(roomTypeId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<RoomTypeImageDto[]>>(`${this.base}/galleries/roomtype/${roomTypeId}`));
      this.roomTypeImages.set(res.data ?? []);
    } catch {
      this.roomTypeImages.set([]);
    }
  }

  private async loadHotelImages(hotelId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<HotelImageResponseDto[]>>(`${this.base}/galleries/hotel/${hotelId}`));
      this.hotelImages.set(res.data ?? []);
    } catch {
      this.hotelImages.set([]);
    }
  }

  async addBlockedDate(roomTypeId: number): Promise<void> {
    if (!this.blockForm.startDate || !this.blockForm.endDate) {
      this.globalUi.showToast('Please select a start and end date.');
      return;
    }
    const request: BlockedDateRequestDto = {
      roomTypeId,
      startDate: this.blockForm.startDate,
      endDate: this.blockForm.endDate,
      reason: this.blockForm.reason
    };
    try {
      const res = await firstValueFrom(this.http.post<ApiResponse<BlockedDateResponseDto>>(`${this.base}/blockeddates`, request));
      if (res.data) this.blockedDates.set([...this.blockedDates(), res.data]);
      this.blockForm = { startDate: '', endDate: '', reason: '' };
      this.globalUi.showToast('Blocked date added.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to add blocked date.');
    }
  }

  async deleteBlockedDate(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<ApiResponse<null>>(`${this.base}/blockeddates/${id}`));
      this.blockedDates.set(this.blockedDates().filter(bd => bd.id !== id));
      this.globalUi.showToast('Blocked date removed.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to remove blocked date.');
    }
  }

  async addPricingOverride(roomTypeId: number): Promise<void> {
    if (!this.pricingForm.startDate || !this.pricingForm.endDate || this.pricingForm.price == null) {
      this.globalUi.showToast('Please fill in the date range and override price.');
      return;
    }
    const request: PricingOverrideRequestDto = {
      roomTypeId,
      startDate: this.pricingForm.startDate,
      endDate: this.pricingForm.endDate,
      price: Number(this.pricingForm.price),
      isActive: true
    };
    try {
      const res = await firstValueFrom(this.http.post<ApiResponse<PricingOverrideDto>>(`${this.base}/pricingoverrides`, request));
      if (res.data) this.pricingOverrides.set([...this.pricingOverrides(), res.data]);
      this.pricingForm = { startDate: '', endDate: '', price: null };
      this.globalUi.showToast('Pricing override added.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to add pricing override.');
    }
  }

  async deletePricingOverride(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<ApiResponse<null>>(`${this.base}/pricingoverrides/${id}`));
      this.pricingOverrides.set(this.pricingOverrides().filter(po => po.id !== id));
      this.globalUi.showToast('Pricing override removed.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to remove pricing override.');
    }
  }

  private validateImageFile(file: File): boolean {
    if (!file.type.startsWith('image/')) {
      this.globalUi.showToast('Please select an image file.');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.globalUi.showToast('Image must be 5MB or smaller.');
      return false;
    }
    return true;
  }

  async onGalleryFileSelected(event: Event, roomTypeId: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.validateImageFile(file)) return;

    const formData = new FormData();
    formData.append('EntityId', String(roomTypeId));
    formData.append('File', file);
    formData.append('IsPrimary', 'false');

    try {
      const res = await firstValueFrom(this.http.post<ApiResponse<RoomTypeImageDto>>(`${this.base}/galleries/roomtype`, formData));
      if (res.data) this.roomTypeImages.set([...this.roomTypeImages(), res.data]);
      this.globalUi.showToast('Image uploaded.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to upload image.');
    }
  }

  async deleteRoomTypeImage(imageId: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<ApiResponse<null>>(`${this.base}/galleries/roomtype/${imageId}`));
      this.roomTypeImages.set(this.roomTypeImages().filter(img => img.id !== imageId));
      this.globalUi.showToast('Image removed.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to remove image.');
    }
  }

  async onHotelFileSelected(event: Event): Promise<void> {
    const hotel = this.hotel();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!hotel || !file || !this.validateImageFile(file)) return;

    const formData = new FormData();
    formData.append('EntityId', String(hotel.id));
    formData.append('File', file);
    formData.append('IsPrimary', 'false');

    try {
      const res = await firstValueFrom(this.http.post<ApiResponse<HotelImageResponseDto>>(`${this.base}/galleries/hotel`, formData));
      if (res.data) this.hotelImages.set([...this.hotelImages(), res.data]);
      this.globalUi.showToast('Hotel image uploaded.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to upload hotel image.');
    }
  }

  async deleteHotelImage(imageId: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<ApiResponse<null>>(`${this.base}/galleries/hotel/${imageId}`));
      this.hotelImages.set(this.hotelImages().filter(img => img.id !== imageId));
      this.globalUi.showToast('Hotel image removed.');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.globalUi.showToast(httpErr.error?.message || 'Failed to remove hotel image.');
    }
  }
}
