import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { AboutContentResponseDto, ContactContentResponseDto } from '../../core/models/content.model';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer implements OnInit {
  private readonly contentService = inject(ContentService);

  readonly about = signal<AboutContentResponseDto | null>(null);
  readonly contact = signal<ContactContentResponseDto | null>(null);

  ngOnInit(): void {
    this.contentService.getAbout().subscribe({ next: (res) => this.about.set(res.data) });
    this.contentService.getContact().subscribe({ next: (res) => this.contact.set(res.data) });
  }
}
