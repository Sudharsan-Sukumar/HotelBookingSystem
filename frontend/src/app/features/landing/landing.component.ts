import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { FooterComponent } from '../../layout/footer/footer.component';
import { AiChatbotComponent } from './ai-chatbot/ai-chatbot.component';
import { AuthService } from '../../core/services/auth.service';
import { GlobalUiService } from '../../core/services/global-ui.service';
import { PromotionsService } from '../../core/services/promotions.service';
import { PromotionResponseDto } from '../../core/models/promotion.model';
import { ContentService } from '../../core/services/content.service';
import { CmsPreviewStore } from '../../core/services/cms-preview-store.service';
import { ApiResponse } from '../../core/models/api-response.model';
import { HotelResponseDto } from '../../core/models/hotel.model';
import { environment } from '../../../environments/environment';

declare const bootstrap: any;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, AiChatbotComponent],
  templateUrl: './landing.component.html'
})
export class LandingComponent implements OnInit, OnDestroy {
  // Set only when embedded as the Admin Content Management live preview — makes this instance
  // additionally listen to CmsPreviewStore so unsaved edits in the CMS editors on the same screen
  // show up here immediately, on top of whatever was last fetched from the backend.
  @Input() previewMode = false;

  guests = 2;
  rooms = 1;
  checkin = '';
  checkout = '';
  pendingRoomSelection: string | null = null;

  // Used as the [min] on the date inputs so the native picker can't even offer a past check-in
  // date or a check-out date before the chosen check-in.
  readonly today = new Date().toISOString().split('T')[0];

  promotions: PromotionResponseDto[] = [];

  // Real, active hotel branches — fetched once so the "Select Hotel Branch" modal always offers
  // every actual branch (previously a hardcoded 3-branch list using stale mock IDs, so bookings
  // for e.g. Coimbatore 404'd downstream with "Hotel not found").
  branches: HotelResponseDto[] = [];

  // Defaults match the original hardcoded copy — used as a fallback if the CMS
  // fetch fails or no Hero/About record has been saved yet, so the page never breaks.
  heroTitle = 'Experience Luxury<br>Redefined';
  heroSubtitle = 'Discover unparalleled comfort and elegance in the heart of the city';
  heroBackgroundImage = '/assets/images/hero_bg.png';
  whyChooseUsHeading = 'Why Choose ElegantEnclave';
  whyChooseUsSubtitle = 'We offer world-class amenities and services to make your stay unforgettable';

  // Kept as a plain, directly-set property (not a getter) — bound to [style.background-image] in
  // the template. Resolved and assigned whenever heroBackgroundImage changes below.
  resolvedHeroBackgroundImage = this.heroBackgroundImage;

  private previewSubs: Subscription[] = [];
  private readonly origin = environment.apiUrl.replace(/\/api\/?$/, '');

  /** CMS-uploaded images come back as a server-relative path (e.g. "/images/hero/x.jpg") served
   * by the API host, not the Angular dev server — resolve to an absolute URL. The frontend-served
   * default (/assets/...) and any admin-typed absolute URL pass through unchanged. Encodes spaces
   * etc. in the path so it's valid inside a CSS url(...) value. */
  private resolveHeroBackgroundImage(url: string): string {
    if (!url) return url;
    if (/^https?:\/\//i.test(url) || url.startsWith('/assets/')) return encodeURI(url);
    return encodeURI(`${this.origin}${url}`);
  }

  constructor(
    private auth: AuthService,
    private ui: GlobalUiService,
    private router: Router,
    private promotionsService: PromotionsService,
    private contentService: ContentService,
    private cdr: ChangeDetectorRef,
    private previewStore: CmsPreviewStore,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Public endpoint — no auth needed. Populates the "Select Hotel Branch" modal with every
    // real active hotel, so it always matches whatever branches actually exist.
    this.http.get<ApiResponse<HotelResponseDto[]>>(`${environment.apiUrl}/hotels`).subscribe({
      next: (res) => {
        this.branches = (res.data || []).filter(h => h.isActive);
        this.cdr.markForCheck();
      },
      error: () => {
        this.branches = [];
        this.cdr.markForCheck();
      }
    });

    // Public endpoint — no auth needed. Only active promotions are returned for anonymous callers.
    this.promotionsService.getAll().subscribe({
      next: (res) => {
        this.promotions = (res.data || []).filter(p => p.isActive).slice(0, 4);
        this.cdr.markForCheck();
      },
      error: () => {
        this.promotions = [];
        this.cdr.markForCheck();
      }
    });

    // Public endpoints — reflect whatever Admin last saved via Content Management. markForCheck()
    // ensures this renders immediately when app-landing is embedded inside another component
    // (the admin Content Management live preview), not just when routed to directly.
    this.contentService.getHero().subscribe({
      next: (res) => {
        const hero = res.data;
        if (!hero) return;
        if (hero.heading) this.heroTitle = hero.heading;
        if (hero.subheading) this.heroSubtitle = hero.subheading;
        if (hero.backgroundImageUrl) {
          this.heroBackgroundImage = hero.backgroundImageUrl;
          this.resolvedHeroBackgroundImage = this.resolveHeroBackgroundImage(hero.backgroundImageUrl);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        // Keep the hardcoded defaults above.
      }
    });

    this.contentService.getAbout().subscribe({
      next: (res) => {
        const about = res.data;
        if (!about) return;
        if (about.heading) this.whyChooseUsHeading = about.heading;
        if (about.subheading) this.whyChooseUsSubtitle = about.subheading;
        this.cdr.markForCheck();
      },
      error: () => {
        // Keep the hardcoded defaults above.
      }
    });

    if (this.previewMode) {
      // Unsaved edits win over whatever was just fetched above — the Admin is actively editing.
      this.previewSubs.push(
        this.previewStore.hero$.subscribe(hero => {
          if (!hero) return;
          this.heroTitle = hero.heading || this.heroTitle;
          this.heroSubtitle = hero.subheading || this.heroSubtitle;
          if (hero.backgroundImageUrl) {
            this.heroBackgroundImage = hero.backgroundImageUrl;
            this.resolvedHeroBackgroundImage = this.resolveHeroBackgroundImage(hero.backgroundImageUrl);
          }
          this.cdr.markForCheck();
        }),
        this.previewStore.about$.subscribe(about => {
          if (!about) return;
          this.whyChooseUsHeading = about.heading || this.whyChooseUsHeading;
          this.whyChooseUsSubtitle = about.subheading || this.whyChooseUsSubtitle;
          this.cdr.markForCheck();
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.previewSubs.forEach(s => s.unsubscribe());
  }

  get guestsRoomsLabel(): string {
    return `${this.guests} Guest${this.guests > 1 ? 's' : ''}, ${this.rooms} Room${this.rooms > 1 ? 's' : ''}`;
  }

  adjustCounter(type: 'guests' | 'rooms', action: 'plus' | 'minus'): void {
    const min = 1;
    const max = type === 'guests' ? 20 : 5;
    const current = type === 'guests' ? this.guests : this.rooms;
    const next = action === 'plus' ? Math.min(current + 1, max) : Math.max(current - 1, min);
    if (type === 'guests') this.guests = next; else this.rooms = next;
  }

  searchRooms(): void {
    const error = this.validateSearchDates();
    if (error) {
      this.ui.showToast(error);
      return;
    }
    this.router.navigate(['/hotels/search'], { queryParams: { checkin: this.checkin, checkout: this.checkout, guests: this.guests, rooms: this.rooms } });
  }

  /** Mirrors the same check-in/check-out rules BookingRequestDto enforces server-side, so a bad
   * date range is caught here on the search widget instead of only failing later at booking time. */
  private validateSearchDates(): string | null {
    if (!this.checkin || !this.checkout) {
      return 'Please select both check-in and check-out dates.';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinDate = new Date(this.checkin);
    const checkoutDate = new Date(this.checkout);

    if (checkinDate < today) {
      return 'Check-in date cannot be in the past.';
    }
    if (checkoutDate <= checkinDate) {
      return 'Check-out date must be after check-in date.';
    }
    const nights = (checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24);
    if (nights > 30) {
      return 'Maximum stay is 30 nights.';
    }
    const daysUntilCheckin = (checkinDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilCheckin > 365) {
      return 'Booking window cannot exceed 365 days.';
    }

    return null;
  }

  triggerRoomBook(roomName: string): void {
    if (!this.auth.isLoggedIn) {
      this.ui.showToast('Please login to continue with room booking.', () => this.router.navigate(['/auth/login']));
      return;
    }

    // These featured cards are illustrative marketing copy, not a link to one specific room row
    // in a specific hotel's inventory — real per-branch room types/availability only exist once a
    // branch is chosen, so every card leads to the same "choose a branch" step, backed by the
    // real, dynamically-fetched branch list. The actual room-selection page (next) is what shows
    // genuine availability ("Rooms Left") per room type at that branch.
    if (!this.branches.length) {
      this.ui.showToast('No hotel branches are available right now. Please try again shortly.');
      return;
    }

    this.pendingRoomSelection = roomName;
    const modalEl = document.getElementById('locationPromptModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
  }

  selectBranchRedirect(hotel: HotelResponseDto): void {
    if (!this.auth.isLoggedIn) {
      this.ui.showToast('Please login to continue.', () => this.router.navigate(['/auth/login']));
      return;
    }

    sessionStorage.setItem('selected_branch_location', hotel.name);
    sessionStorage.setItem('selected_room_name', this.pendingRoomSelection || '');
    this.router.navigate(['/bookings/room-selection'], { queryParams: { hotelId: hotel.id } });
  }
}
