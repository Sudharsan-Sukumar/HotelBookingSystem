import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ValidationService } from '../../../core/services/validation.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelRequestDto, HotelResponseDto } from '../../../core/models/hotel.model';

/**
 * Wired to POST api/hotels (Admin-only, Features/Hotels/Controllers/HotelsController.cs).
 * HotelRequestDto requires Description/State/Country/ZipCode/StarRating which the original mock
 * form never captured — those fields were added to the template (see add-hotel.component.html)
 * since the request cannot succeed without them. branchName/contact/email/managerId have no
 * backend column on Hotel; they are kept in the UI (unchanged layout) but are not sent in the
 * create payload. managerId, if selected, is applied via the separate
 * POST api/hotels/{id}/managers endpoint after the hotel is created.
 */
@Component({
  selector: 'app-add-hotel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './add-hotel.component.html',
  styleUrls: ['./add-hotel.component.scss']
})
export class AddHotelComponent {
  private readonly http = inject(HttpClient);
  private readonly validation = inject(ValidationService);
  private readonly ui = inject(GlobalUiService);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/hotels`;

  hotelName = '';
  branchName = '';
  city = '';
  otherCity = '';
  contact = '';
  email = '';
  managerId = '';
  address = '';

  state = 'Tamil Nadu';
  country = 'India';
  zipCode = '';
  starRating: number | null = null;
  description = '';

  errors: Record<string, string> = {};

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
    if (!this.validation.isValidPhone(this.contact) || !/^[6-9]\d{9}$/.test(this.contact.trim())) {
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
    this.router.navigate(['/admin/hotels']);
  }

  onSubmit(): void {
    let isValid = true;

    if (!this.hotelName.trim()) { this.setError('hotelName', 'Hotel name is required.'); isValid = false; } else { this.clearError('hotelName'); }
    if (!this.branchName.trim()) { this.setError('branchName', 'Branch name is required.'); isValid = false; } else { this.clearError('branchName'); }
    if (!this.city) { this.setError('city', 'Please select a city.'); isValid = false; } else { this.clearError('city'); }
    if (this.city === 'Others' && !this.otherCity.trim()) { this.setError('otherCity', 'Please specify the district name.'); isValid = false; } else { this.clearError('otherCity'); }
    if (!this.address.trim()) { this.setError('address', 'Address is required.'); isValid = false; } else { this.clearError('address'); }
    if (!this.validateContact()) isValid = false;
    if (!this.validateEmail()) isValid = false;

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
      isActive: true
    };

    this.http.post<ApiResponse<HotelResponseDto>>(this.base, body).subscribe({
      next: res => {
        const createdId = res.data.id;
        if (this.managerId) {
          this.http.post<ApiResponse<null>>(`${this.base}/${createdId}/managers`, Number(this.managerId)).subscribe({
            next: () => this.finishCreate(newHotelCity),
            error: () => this.finishCreate(newHotelCity)
          });
        } else {
          this.finishCreate(newHotelCity);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.ui.showToast(err.error?.errors?.[0] || err.error?.message || 'Failed to create hotel.');
      }
    });
  }

  private finishCreate(cityName: string): void {
    this.ui.showToast(`Hotel Created Successfully in ${cityName}.`, () => {
      this.router.navigate(['/admin/hotels']);
    });
  }
}
