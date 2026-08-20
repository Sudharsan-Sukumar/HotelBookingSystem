import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';

/**
 * BLOCKED BY BACKEND LIMITATION: no housekeeping endpoint exists.
 *
 * `Hotel.Housekeeping` (Features/Hotels/Models/Hotel.cs) is a denormalized `List<HousekeepingTaskInfo>`
 * field on the Hotel entity, but it is never exposed on `HotelResponseDto`, `HotelRequestDto`, or any
 * controller action — there is no `HousekeepingController` and no read/write route anywhere in the
 * backend source. There is genuinely nothing to wire this page to.
 *
 * Rather than fabricate task data or fake a mutation, this page is left as a clear "not yet available"
 * informational state until the backend adds a housekeeping endpoint.
 */
@Component({
  selector: 'app-manager-housekeeping',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Housekeeping</li>
        </ol>
      </nav>

      <div class="mb-4 text-start">
        <h1 class="font-serif fw-bold text-purple h2 mb-1">Housekeeping Tasks</h1>
        <p class="text-secondary small mb-0">Room cleaning and maintenance task board.</p>
      </div>

      <div class="card border shadow-sm bg-white p-5 text-center" style="border-radius:12px;">
        <i class="bi bi-tools text-muted mb-3 d-block" style="font-size:2.5rem;"></i>
        <h6 class="text-purple fw-bold mb-2">Not yet available</h6>
        <p class="text-muted small mb-0">
          The backend has no housekeeping endpoint yet, so this page cannot show or manage real tasks.
          Housekeeping data exists on the Hotel entity but is not exposed by any API route.
        </p>
      </div>
    </div>
  `
})
export class HousekeepingComponent {}
