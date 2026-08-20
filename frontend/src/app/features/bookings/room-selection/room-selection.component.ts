import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';
import { BookingWorkflowStore } from '../store/booking-workflow.store';

interface RoomCardVm {
  roomType: RoomTypeResponseDto;
  formattedPrice: string;
  images: string[];
}

/**
 * Real-backend version. Loads GET /api/hotels/{hotelId} and GET /api/hotels/{hotelId}/roomtypes,
 * lists active room types (booking selects a RoomTypeId — physical room allocation happens
 * server-side, per the migration brief), and on selection writes the `hbs_booking_selection`
 * contract (now keyed by roomTypeId) consumed by guest-details / invoice-summary / payment-portal.
 */
@Component({
  selector: 'app-room-selection',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './room-selection.component.html',
  styleUrl: './room-selection.component.scss'
})
export class RoomSelectionComponent implements OnInit {
  private readonly base = environment.apiUrl;

  hotel: HotelResponseDto | null = null;
  hotelId = '';
  branchName = 'Coimbatore';
  backToHotelHref = '/hotels/search';
  notFound = false;
  noRooms = false;

  rooms: RoomCardVm[] = [];
  private nights = 1;
  private searchState: { checkIn: string; checkOut: string; adults?: number; children?: number } = {
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  };

  private readonly bookingStore = inject(BookingWorkflowStore);

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.hotelId = this.route.snapshot.queryParamMap.get('hotelId') || '';
    if (!this.hotelId) {
      this.notFound = true;
      return;
    }

    const rawSearch = sessionStorage.getItem('hbs_booking_search');
    if (rawSearch) {
      try {
        const parsed = JSON.parse(rawSearch);
        this.searchState = {
          checkIn: parsed.checkIn || this.searchState.checkIn,
          checkOut: parsed.checkOut || this.searchState.checkOut,
          adults: Number(parsed.adults) || 1,
          children: Number(parsed.children) || 0
        };
      } catch { /* keep fallback */ }
    }

    if (this.searchState.checkIn && this.searchState.checkOut) {
      const ci = new Date(this.searchState.checkIn);
      const co = new Date(this.searchState.checkOut);
      const diffDays = Math.ceil(Math.abs(co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) this.nights = diffDays;
    }

    this.http.get<ApiResponse<HotelResponseDto>>(`${this.base}/hotels/${this.hotelId}`).subscribe({
      next: (res) => {
        this.hotel = res.data;
        this.branchName = this.hotel.city || 'Coimbatore';
        this.backToHotelHref = `/hotels/${this.hotelId}`;
        this.loadRoomTypes();
      },
      error: () => { this.notFound = true; }
    });
  }

  private loadRoomTypes(): void {
    this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/hotels/${this.hotelId}/roomtypes`).subscribe({
      next: (res) => {
        const active = (res.data || []).filter(r => r.isActive && !r.isUnderMaintenance);
        if (active.length === 0) {
          this.noRooms = true;
          return;
        }
        this.rooms = active.map(rt => this.buildRoomVm(rt));
      },
      error: () => { this.noRooms = true; }
    });
  }

  private buildRoomVm(roomType: RoomTypeResponseDto): RoomCardVm {
    const formattedPrice = roomType.basePrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const type = (roomType.name || '').toLowerCase();
    let images: string[];
    if (type.includes('standard')) {
      images = ['/assets/images/rooms/standard/standard-1.jpg', '/assets/images/rooms/standard/standard-2.jpg', '/assets/images/rooms/standard/standard-3.jpg'];
    } else if (type.includes('deluxe')) {
      images = ['/assets/images/rooms/deluxe/deluxe-1.jpg', '/assets/images/rooms/deluxe/deluxe-2.jpg', '/assets/images/rooms/deluxe/deluxe-3.jpg'];
    } else if (type.includes('suite') && !type.includes('presidential') && !type.includes('executive')) {
      images = ['/assets/images/rooms/suite/suite-1.jpg', '/assets/images/rooms/suite/suite-2.jpg', '/assets/images/rooms/suite/suite-3.jpg'];
    } else if (type.includes('presidential')) {
      images = ['/assets/images/rooms/presidential/presidential-1.jpg', '/assets/images/rooms/presidential/presidential-2.jpg', '/assets/images/rooms/presidential/presidential-3.jpg'];
    } else {
      images = ['/assets/images/rooms/standard/standard-1.jpg', '/assets/images/rooms/standard/standard-2.jpg', '/assets/images/rooms/standard/standard-3.jpg'];
    }

    return { roomType, formattedPrice, images };
  }

  selectRoom(vm: RoomCardVm): void {
    const pricePerNight = vm.roomType.basePrice;
    const totalAmount = pricePerNight * this.nights;
    const taxAmount = totalAmount * 0.18; // 18% GST — matches backend's own tax computation shown on GET /bookings responses
    const grandTotal = totalAmount + taxAmount;

    const selection = {
      roomTypeId: vm.roomType.id,
      roomTypeName: vm.roomType.name,
      hotelId: Number(this.hotelId),
      checkIn: this.searchState.checkIn,
      checkOut: this.searchState.checkOut,
      nights: this.nights,
      pricePerNight,
      totalAmount,
      taxAmount,
      grandTotal,
      adults: this.searchState.adults,
      children: this.searchState.children,
      maxOccupancy: vm.roomType.capacity
    };

    this.bookingStore.setSelection(selection);

    this.router.navigate(['/bookings/guest-details']);
  }
}
