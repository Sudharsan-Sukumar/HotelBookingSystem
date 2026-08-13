import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Header } from '../../../layout/header/header';
import { Footer } from '../../../layout/footer/footer';
import { ContentService } from '../../../core/services/content.service';
import { HeroContentResponseDto } from '../../../core/models/content.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  private readonly contentService = inject(ContentService);
  private readonly router = inject(Router);

  readonly hero = signal<HeroContentResponseDto | null>(null);

  readonly checkin = signal('');
  readonly checkout = signal('');
  readonly guests = signal(2);
  readonly rooms = signal(1);
  readonly guestsDropdownOpen = signal(false);

  ngOnInit(): void {
    this.contentService.getHero().subscribe({ next: (res) => this.hero.set(res.data) });
  }

  toggleGuestsDropdown(): void {
    this.guestsDropdownOpen.update((v) => !v);
  }

  adjustGuests(delta: number): void {
    this.guests.update((v) => Math.min(10, Math.max(1, v + delta)));
  }

  adjustRooms(delta: number): void {
    this.rooms.update((v) => Math.min(5, Math.max(1, v + delta)));
  }

  search(): void {
    this.router.navigate(['/hotels'], {
      queryParams: {
        checkin: this.checkin(),
        checkout: this.checkout(),
        guests: this.guests(),
        rooms: this.rooms(),
      },
    });
  }
}
