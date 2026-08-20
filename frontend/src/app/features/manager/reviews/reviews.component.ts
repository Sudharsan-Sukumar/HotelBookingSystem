import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ReviewDto } from '../../../core/models/manager.model';
import { environment } from '../../../../environments/environment';

/**
 * New manager feature: view reviews for the manager's hotel and respond to ones without a
 * manager response yet. GET api/reviews/hotel/{hotelId} (public list) + POST
 * api/reviews/{reviewId}/respond (Manager/Admin, body { response }, max 500 chars).
 */
@Component({
  selector: 'app-manager-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Reviews</li>
        </ol>
      </nav>

      <div class="mb-4 text-start">
        <h1 class="font-serif fw-bold text-purple h2 mb-1">Guest Reviews</h1>
        <p class="text-secondary small mb-0">Reviews for {{ hotelName() || 'your hotel' }}. Respond to guests who haven't heard back yet.</p>
      </div>

      @if (noHotel()) {
        <div class="alert alert-warning">No managed hotel could be resolved for your account.</div>
      } @else if (loading()) {
        <p class="text-muted">Loading reviews...</p>
      } @else {

      <div class="d-flex flex-column gap-3">
        @for (r of reviews(); track r.id) {
          <div class="card border shadow-sm bg-white p-3" style="border-radius:12px;">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
              <div>
                <span class="fw-bold text-purple">
                  @for (s of starArray(r.rating); track $index) {
                    <i class="bi bi-star-fill text-warning"></i>
                  }
                  @for (s of starArray(5 - r.rating); track $index) {
                    <i class="bi bi-star text-warning"></i>
                  }
                </span>
                <span class="text-muted small ms-2">{{ r.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>
            <p class="mb-2 small">{{ r.comment || 'No comment left.' }}</p>

            @if (r.managerResponse) {
              <div class="p-2 bg-light rounded border small" style="border-color:#ECE6D8!important;">
                <strong class="text-purple">Manager response:</strong> {{ r.managerResponse }}
              </div>
            } @else {
              <div class="mt-2">
                <textarea class="form-control form-control-sm mb-2" rows="2" maxlength="500"
                  placeholder="Write a response (max 500 characters)..."
                  [(ngModel)]="draftResponses[r.id]"></textarea>
                <button class="btn btn-sm btn-purple" style="background-color:#1A0A2E;color:#D4AF37;border-color:#D4AF37;"
                  [disabled]="!draftResponses[r.id]?.trim() || submitting.has(r.id)"
                  (click)="submitResponse(r)">
                  {{ submitting.has(r.id) ? 'Submitting...' : 'Submit Response' }}
                </button>
                @if (errorFor[r.id]) {
                  <p class="text-danger small mt-1 mb-0">{{ errorFor[r.id] }}</p>
                }
              </div>
            }
          </div>
        } @empty {
          <div class="card border shadow-sm bg-white p-5 text-center" style="border-radius:12px;">
            <i class="bi bi-chat-square-text text-muted mb-3 d-block" style="font-size:2.5rem;"></i>
            <h6 class="text-purple fw-bold mb-1">No reviews yet</h6>
            <p class="text-muted small mb-0">This hotel has no guest reviews to show.</p>
          </div>
        }
      </div>
      }
    </div>
  `
})
export class ReviewsComponent {
  private readonly base = environment.apiUrl;
  private hotelId: number | null = null;

  readonly noHotel = signal(false);
  readonly loading = signal(true);
  private readonly reviewsList = signal<ReviewDto[]>([]);
  readonly hotelName = signal<string | null>(null);

  readonly reviews = computed(() => this.reviewsList());

  draftResponses: Record<number, string> = {};
  errorFor: Record<number, string> = {};
  readonly submitting = new Set<number>();

  constructor(
    private http: HttpClient,
    private hotelScope: ManagerHotelScopeService
  ) {
    this.load();
  }

  private async load(): Promise<void> {
    const hotel = await this.hotelScope.getPrimaryHotel();
    if (!hotel) {
      this.noHotel.set(true);
      this.loading.set(false);
      return;
    }
    this.hotelId = hotel.id;
    this.hotelName.set(hotel.name);
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<ReviewDto[]>>(`${this.base}/reviews/hotel/${hotel.id}`)
      );
      this.reviewsList.set(res.data ?? []);
    } catch {
      this.reviewsList.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  starArray(count: number): number[] {
    return Array.from({ length: Math.max(0, count) });
  }

  async submitResponse(r: ReviewDto): Promise<void> {
    const response = (this.draftResponses[r.id] || '').trim();
    if (!response) return;
    this.errorFor[r.id] = '';
    this.submitting.add(r.id);
    try {
      await firstValueFrom(
        this.http.post<ApiResponse<ReviewDto>>(`${this.base}/reviews/${r.id}/respond`, { response })
      );
      this.reviewsList.set(
        this.reviewsList().map(x => x.id === r.id ? { ...x, managerResponse: response } : x)
      );
      delete this.draftResponses[r.id];
    } catch (err: any) {
      this.errorFor[r.id] = err?.error?.message || 'Failed to submit response.';
    } finally {
      this.submitting.delete(r.id);
    }
  }
}
