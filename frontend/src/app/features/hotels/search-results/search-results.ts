import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Header } from '../../../layout/header/header';
import { Footer } from '../../../layout/footer/footer';
import { HotelService } from '../../../core/services/hotel.service';
import { SearchHotelResultDto } from '../../../core/models/hotel.model';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResults implements OnInit {
  private readonly hotelService = inject(HotelService);
  private readonly route = inject(ActivatedRoute);

  readonly city = signal('Chennai');
  readonly checkin = signal('');
  readonly checkout = signal('');
  readonly guests = signal(2);

  readonly results = signal<SearchHotelResultDto[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searched = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.checkin.set(params.get('checkin') ?? '');
    this.checkout.set(params.get('checkout') ?? '');
    this.guests.set(Number(params.get('guests')) || 2);

    if (this.checkin() && this.checkout()) {
      this.search();
    }
  }

  search(): void {
    if (!this.checkin() || !this.checkout()) {
      this.errorMessage.set('Please select check-in and check-out dates.');
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);
    this.searched.set(true);

    this.hotelService
      .search({
        destinationCity: this.city(),
        checkInDate: this.checkin(),
        checkOutDate: this.checkout(),
        guests: this.guests(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.results.set(res.data ?? []);
        },
        error: (err) => {
          this.loading.set(false);
          this.results.set([]);
          this.errorMessage.set(err?.error?.message ?? 'No hotels found for the selected destination and dates.');
        },
      });
  }
}
