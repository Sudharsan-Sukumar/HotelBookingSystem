import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto, SearchHotelResultDto } from '../../../core/models/hotel.model';

interface SavedSearch {
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number | string;
  children: number | string;
}

/**
 * Real-backend version. Calls GET /api/hotels/search (destinationCity/checkInDate/
 * checkOutDate/guests/pageNumber/pageSize) and renders SearchHotelResultDto[].
 *
 * Backend gap (documented, not invented around): SearchRequestDto has no price-range or
 * room-type filter, and SearchHotelResultDto carries neither a room-type breakdown nor an
 * amenities list. The existing max-price filter is kept as a pure CLIENT-SIDE post-filter on
 * `startingPrice`. The room-type checkboxes are visually kept (matching the untouched template)
 * but are now no-ops against real data — there is nothing in SearchHotelResultDto to filter by
 * room type — a fact called out explicitly in the final report, not silently faked.
 */
@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss'
})
export class SearchResultsComponent implements OnInit {
  private readonly base = environment.apiUrl;

  // Filter model — 'All' matches the existing "All Locations" <option> in the template.
  filterLocation = 'All';
  filterCheckIn = '';
  filterCheckOut = '';
  filterMaxPrice = '';
  checkedTypes: Record<string, boolean> = {
    Standard: false,
    Deluxe: false,
    Suite: false,
    'Presidential Suite': false
  };
  sortBy = 'none';

  checkinMin = '';
  checkoutMin = '';
  dateError = '';

  results: SearchHotelResultDto[] = [];
  noResults = false;
  isFetching = false;
  loadError = '';
  /** True while showing the unfiltered "all hotels" default view (no destination/dates chosen yet). */
  showingAllHotels = false;

  private guests = 1;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    let savedSearch: SavedSearch | null = null;

    if (qp.has('location') || qp.has('checkin')) {
      savedSearch = {
        location: qp.get('location') || '',
        checkIn: qp.get('checkin') || '',
        checkOut: qp.get('checkout') || '',
        adults: qp.get('adults') || 1,
        children: qp.get('children') || 0
      };
      sessionStorage.setItem('hbs_booking_search', JSON.stringify(savedSearch));
    } else {
      const raw = sessionStorage.getItem('hbs_booking_search');
      if (raw) {
        try { savedSearch = JSON.parse(raw); } catch { /* ignore */ }
      }
    }

    this.checkinMin = new Date().toISOString().split('T')[0];

    // Only treat this as an actual search if the user (or the landing-page search form) supplied
    // a real destination — otherwise the Hotels page should open showing every hotel, with no
    // pre-selected restrictive filter, per the existing "browse all" requirement.
    if (savedSearch && savedSearch.location && savedSearch.location !== 'All') {
      this.filterLocation = savedSearch.location;
      if (savedSearch.checkIn) this.filterCheckIn = savedSearch.checkIn;
      if (savedSearch.checkOut) this.filterCheckOut = savedSearch.checkOut;
      this.guests = Number(savedSearch.adults || 1) + Number(savedSearch.children || 0);
      if (this.guests < 1) this.guests = 1;

      if (!this.filterCheckIn) this.filterCheckIn = this.checkinMin;
      if (!this.filterCheckOut) {
        const co = new Date(this.filterCheckIn);
        co.setDate(co.getDate() + 1);
        this.filterCheckOut = co.toISOString().split('T')[0];
      }

      this.onCheckinChange();
      this.runSearch();
    } else {
      this.loadAllHotels();
    }
  }

  /** Default "browse all hotels" view — GET /api/hotels (existing, unfiltered endpoint), no
   * destination/date/room-type filter pre-applied. Used only until the user actually searches. */
  private loadAllHotels(): void {
    this.loadError = '';
    this.isFetching = true;
    this.showingAllHotels = true;

    this.http.get<ApiResponse<HotelResponseDto[]>>(`${this.base}/hotels`).subscribe({
      next: (res) => {
        this.isFetching = false;
        const mapped: SearchHotelResultDto[] = (res.data || [])
          .filter(h => h.isActive)
          .map(h => ({
            hotelId: h.id,
            hotelCustomId: h.hotelCustomId,
            name: h.name,
            city: h.city,
            starRating: h.starRating,
            thumbnailUrl: h.thumbnailUrl,
            // Per-hotel starting price only exists on the dated /hotels/search response —
            // left undefined here deliberately; formatPrice() shows a friendly fallback for it.
            startingPrice: undefined as unknown as number,
            isAvailable: true
          }));
        this.applyClientFilters(mapped);
      },
      error: () => {
        this.isFetching = false;
        this.results = [];
        this.noResults = true;
      }
    });
  }

  onCheckinChange(): void {
    if (this.filterCheckIn) {
      const ci = new Date(this.filterCheckIn);
      ci.setDate(ci.getDate() + 1);
      this.checkoutMin = ci.toISOString().split('T')[0];
      if (this.filterCheckOut && new Date(this.filterCheckOut) <= new Date(this.filterCheckIn)) {
        this.filterCheckOut = '';
      }
    } else {
      this.checkoutMin = '';
    }
  }

  private runSearch(): void {
    this.loadError = '';
    this.isFetching = true;
    this.showingAllHotels = false;

    const params: Record<string, string> = {
      destinationCity: (this.filterLocation || '').trim(),
      checkInDate: this.filterCheckIn,
      checkOutDate: this.filterCheckOut,
      guests: String(this.guests || 1),
      pageNumber: '1',
      pageSize: '20'
    };

    this.http.get<ApiResponse<SearchHotelResultDto[]>>(`${this.base}/hotels/search`, { params }).subscribe({
      next: (res) => {
        this.isFetching = false;
        this.applyClientFilters(res.data || []);
      },
      error: (err: HttpErrorResponse) => {
        this.isFetching = false;
        if (err.status === 404) {
          // Backend returns 404 when no hotels match — treat as an empty-results state, not an error.
          this.applyClientFilters([]);
        } else if (err.status === 400) {
          this.loadError = (err as any).friendlyMessage || 'Please check your search filters.';
          this.results = [];
          this.noResults = true;
        } else {
          this.results = [];
          this.noResults = true;
        }
      }
    });
  }

  private applyClientFilters(all: SearchHotelResultDto[]): void {
    this.lastRawResults = all;
    const maxPriceRaw = (this.filterMaxPrice || '').replace(/[^0-9.]/g, '');
    const maxPrice = maxPriceRaw !== '' ? parseFloat(maxPriceRaw) : Infinity;

    let filtered = all.filter(h => h.isAvailable);
    // startingPrice is undefined in the "browse all hotels" default view (no dates chosen yet,
    // see loadAllHotels) — a max-price filter has nothing to compare against there, so skip it
    // rather than filtering every hotel out.
    if (isFinite(maxPrice) && !this.showingAllHotels) {
      filtered = filtered.filter(h => h.startingPrice <= maxPrice);
    }

    if (this.sortBy === 'price_low') filtered = [...filtered].sort((a, b) => a.startingPrice - b.startingPrice);
    if (this.sortBy === 'price_high') filtered = [...filtered].sort((a, b) => b.startingPrice - a.startingPrice);
    if (this.sortBy === 'rating_high') filtered = [...filtered].sort((a, b) => b.starRating - a.starRating);

    this.results = filtered;
    this.noResults = filtered.length === 0;
  }

  private lastRawResults: SearchHotelResultDto[] = [];

  onSortChange(): void {
    this.applyClientFilters(this.lastRawResults);
  }

  applyFilters(): void {
    this.dateError = '';

    // "All Locations" has no corresponding backend search (destinationCity is required) — treat
    // it the same as the default browse-all view rather than forcing the user to pick a city.
    if (this.filterLocation === 'All') {
      this.loadAllHotels();
      return;
    }

    if (!this.filterCheckIn || !this.filterCheckOut) {
      this.dateError = 'Please select both check-in and check-out dates to search.';
      return;
    }

    if (this.filterCheckIn && this.filterCheckOut) {
      const ci = new Date(this.filterCheckIn);
      const co = new Date(this.filterCheckOut);
      ci.setHours(0, 0, 0, 0);
      co.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (ci < today) {
        this.dateError = 'Check-in date cannot be in the past.';
        return;
      }
      if (co <= ci) {
        this.dateError = 'Check-out must be after check-in.';
        return;
      }
    }

    sessionStorage.setItem('hbs_booking_search', JSON.stringify({
      location: this.filterLocation, checkIn: this.filterCheckIn, checkOut: this.filterCheckOut,
      adults: this.guests, children: 0
    }));

    this.runSearch();
  }

  resetFilters(): void {
    this.filterLocation = 'All';
    this.filterCheckIn = '';
    this.filterCheckOut = '';
    this.checkoutMin = '';
    this.filterMaxPrice = '';
    Object.keys(this.checkedTypes).forEach(k => (this.checkedTypes[k] = false));
    this.dateError = '';
    this.sortBy = 'none';
    sessionStorage.removeItem('hbs_booking_search');
    this.loadAllHotels();
  }

  viewDetails(hotelId: number): void {
    sessionStorage.setItem('hbs_booking_search', JSON.stringify({
      location: this.filterLocation, checkIn: this.filterCheckIn, checkOut: this.filterCheckOut,
      adults: this.guests, children: 0
    }));
    this.router.navigate(['/hotels', hotelId]);
  }

  formatPrice(value: number): string {
    // The "browse all hotels" default view (loadAllHotels) has no per-hotel price — /api/hotels
    // doesn't carry one, only the dated /api/hotels/search does — so show a friendly fallback
    // instead of the raw "₹NaN" that Number(undefined) would otherwise produce.
    if (value === undefined || value === null || isNaN(Number(value))) {
      return 'View Rooms for Pricing';
    }
    return '₹' + Number(value).toLocaleString('en-IN');
  }
}
