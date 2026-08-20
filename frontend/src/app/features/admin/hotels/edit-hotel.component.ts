import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ValidationService } from '../../../core/services/validation.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelRequestDto, HotelResponseDto } from '../../../core/models/hotel.model';

/**
 * Wired to GET/PUT api/hotels/{id} (Admin-only). See add-hotel.component.ts for why
 * State/Country/ZipCode/StarRating/Description were added to the template, and why
 * branchName/contact/email/managerId are kept in the UI but not sent to the backend
 * (Hotel has no corresponding columns) — managerId assignment goes through the separate
 * POST api/hotels/{id}/managers endpoint.
 */
@Component({
  selector: 'app-edit-hotel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './edit-hotel.component.html',
  styleUrls: ['./edit-hotel.component.scss']
})
export class EditHotelComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly validation = inject(ValidationService);
  private readonly ui = inject(GlobalUiService);
  private readonly base = `${environment.apiUrl}/hotels`;

  hotelId = '';
  notFound = false;
  loading = true;

  hotelName = '';
  branchName = '';
  city = '';
  otherCity = '';
  contact = '';
  email = '';
  managerId = '';
  status = 'Active';
  address = '';

  state = '';
  country = '';
  zipCode = '';
  starRating: number | null = null;
  description = '';

  private rowVersion: string | null = null;

  errors: Record<string, string> = {};

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      this.loading = false;
      return;
    }
    this.hotelId = id;
    this.http.get<ApiResponse<HotelResponseDto>>(`${this.base}/${id}`).subscribe({
      next: res => this.applyHotel(res.data),
      error: () => {
        this.notFound = true;
        this.loading = false;
      }
    });
  }

  private applyHotel(h: HotelResponseDto): void {
    this.hotelId = String(h.id);
    this.hotelName = h.name || '';
    this.branchName = h.location || '';
    this.address = h.location || '';

    if (['Salem', 'Coimbatore', 'Chennai'].includes(h.city)) {
      this.city = h.city;
    } else if (h.city) {
      this.city = 'Others';
      this.otherCity = h.city;
    }

    this.state = h.state || '';
    this.country = h.country || '';
    this.zipCode = h.zipCode || '';
    this.starRating = h.starRating ?? null;
    this.description = h.description || '';
    this.status = h.isActive ? 'Active' : 'Inactive';
    this.rowVersion = h.rowVersion || null;
    this.loading = false;
  }

  /** No backend endpoint exposes a manager list to the Admin hotel form; kept empty (Unassigned only). */
  get managers(): { id: string; firstName: string; lastName: string }[] {
    return [];
  }

  get isOtherCity(): boolean {
    return this.city === 'Others';
  }

  hasError(field: string): boolean {
    return !!this.errors[field];
  }

  private setError(field: string, message: string): void {
    this.errors[field] = message;
  }

  private clearError(field: string): void {
    delete this.errors[field];
  }

  validateContact(): boolean {
    if (!/^[6-9]\d{9}$/.test(this.contact.trim())) {
      this.setError('contact', 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return false;
    }
    this.clearError('contact');
    return true;
  }

  validateEmail(): boolean {
    if (!this.validation.isValidEmail(this.email)) {
      this.setError('email', 'Please enter a valid email address.');
      return false;
    }
    this.clearError('email');
    return true;
  }

  onCityChange(): void {
    if (this.city !== 'Others') {
      this.otherCity = '';
      this.clearError('otherCity');
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/hotels', this.hotelId]);
  }

  onSubmit(): void {
    let isValid = true;

    if (!this.hotelName.trim()) { this.setError('hotelName', 'Hotel name is required.'); isValid = false; } else { this.clearError('hotelName'); }
    if (!this.city) { this.setError('city', 'Please select a city.'); isValid = false; } else { this.clearError('city'); }
    if (this.city === 'Others' && !this.otherCity.trim()) { this.setError('otherCity', 'Please specify the district name.'); isValid = false; } else { this.clearError('otherCity'); }
    if (!this.address.trim()) { this.setError('address', 'Address is required.'); isValid = false; } else { this.clearError('address'); }

    if (!this.state.trim()) { this.setError('state', 'State is required.'); isValid = false; } else { this.clearError('state'); }
    if (!this.country.trim()) { this.setError('country', 'Country is required.'); isValid = false; } else { this.clearError('country'); }
    if (!/^[1-9][0-9]{5}$/.test(this.zipCode.trim())) { this.setError('zipCode', 'Zip code must be 6 digits.'); isValid = false; } else { this.clearError('zipCode'); }
    if (!this.starRating || this.starRating < 1 || this.starRating > 5) { this.setError('starRating', 'Please select a star rating.'); isValid = false; } else { this.clearError('starRating'); }
    if (!this.description.trim()) { this.setError('description', 'Description is required.'); isValid = false; } else { this.clearError('description'); }

    if (!isValid) return;

    const newHotelCity = this.city === 'Others' ? this.otherCity.trim() : this.city;

    const body: HotelRequestDto = {
      name: this.hotelName.trim(),
      description: this.description.trim(),
      location: this.address.trim(),
      city: newHotelCity,
      state: this.state.trim(),
      country: this.country.trim(),
      zipCode: this.zipCode.trim(),
      starRating: this.starRating as number,
      isActive: this.status === 'Active',
      rowVersion: this.rowVersion
    };

    this.http.put<ApiResponse<HotelResponseDto>>(`${this.base}/${this.hotelId}`, body).subscribe({
      next: res => {
        this.rowVersion = res.data.rowVersion;
        if (this.managerId) {
          this.http.post<ApiResponse<null>>(`${this.base}/${this.hotelId}/managers`, Number(this.managerId)).subscribe({
            next: () => this.finishUpdate(),
            error: () => this.finishUpdate()
          });
        } else {
          this.finishUpdate();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.ui.showToast(err.error?.errors?.[0] || err.error?.message || 'Failed to update hotel.');
      }
    });
  }

  private finishUpdate(): void {
    this.ui.showToast('Hotel Updated Successfully.', () => {
      this.router.navigate(['/admin/hotels', this.hotelId]);
    });
  }
}
