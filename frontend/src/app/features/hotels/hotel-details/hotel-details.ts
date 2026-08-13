import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Header } from '../../../layout/header/header';
import { Footer } from '../../../layout/footer/footer';
import { Reviews } from '../reviews/reviews';
import { HotelService } from '../../../core/services/hotel.service';
import { HotelResponseDto } from '../../../core/models/hotel.model';

@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [CommonModule, RouterLink, Header, Footer, Reviews],
  templateUrl: './hotel-details.html',
  styleUrl: './hotel-details.scss',
})
export class HotelDetails implements OnInit {
  private readonly hotelService = inject(HotelService);
  private readonly route = inject(ActivatedRoute);

  readonly hotel = signal<HotelResponseDto | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.hotelService.getById(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res.data) {
          this.notFound.set(true);
          return;
        }
        this.hotel.set(res.data);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }
}
