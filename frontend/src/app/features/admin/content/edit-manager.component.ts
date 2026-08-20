import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HotelStateService } from '../../../core/services/hotel-state.service';
import { ValidationService } from '../../../core/services/validation.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';

/**
 * Direct port of edit_manager.html + edit_manager.js.
 * Despite the folder placement (content/), this page edits a Manager USER
 * ACCOUNT record in HotelStateService.users (firstName/lastName/email/phone/
 * assignedHotelId/status) — not any site "content" object. The original
 * looked the user up via `sessionStorage.adminEditUserId`; ported here to use
 * the route param `id` per this app's routing convention (route:
 * content/manager/:id).
 */
@Component({
  selector: 'app-admin-edit-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './edit-manager.component.html',
  styleUrls: ['./edit-manager.component.scss']
})
export class EditManagerComponent implements OnInit {
  managerId = '';
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  empId = '';
  assignedHotelId = '';
  status = 'Active';
  adminNotes = '';

  emailInvalid = false;
  phoneInvalid = false;

  hotels: { id: string; name: string }[] = [];

  headerName = '';
  headerId = '';
  headerStatus = 'Active';

  private notFound = false;

  constructor(
    private route: ActivatedRoute,
    private hotelState: HotelStateService,
    private validation: ValidationService,
    private ui: GlobalUiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.managerId = this.route.snapshot.paramMap.get('id') || '';
    this.hotels = this.hotelState.hotels.map(h => ({ id: h.id, name: h.name }));

    const user = this.hotelState.getUserById(this.managerId);
    if (!user) {
      this.notFound = true;
      alert('User not found!');
      this.router.navigate(['/admin/users']);
      return;
    }

    this.firstName = user.firstName || (user.name ? user.name.split(' ')[0] : '');
    this.lastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
    this.email = user.email || '';
    this.phone = user.phone || '';
    this.empId = user.id;
    this.assignedHotelId = user.assignedHotelId || '';
    this.status = user.status || 'Active';

    this.headerName = this.firstName ? `${this.firstName} ${this.lastName}` : (user.name || user.email);
    this.headerId = user.id;
    this.headerStatus = user.status || 'Active';
  }

  get initials(): string {
    const name = this.headerName || '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || '?';
  }

  onNotesInput(): void {
    if (this.adminNotes.length > 250) {
      this.adminNotes = this.adminNotes.slice(0, 250);
    }
  }

  resetPassword(): void {
    if (confirm('Are you sure you want to reset password credentials for this manager?')) {
      this.ui.showToast('Temporary password has been generated and dispatched to manager email.');
    }
  }

  deactivate(): void {
    if (confirm('Deactivate Manager? The manager will lose system access immediately. Room and booking data remain unchanged.')) {
      this.status = 'Inactive';
      this.headerStatus = 'Inactive';
      this.ui.showToast('Manager account deactivated successfully.');
    }
  }

  private validate(): boolean {
    this.emailInvalid = !this.validation.isValidEmail(this.email);
    this.phoneInvalid = !this.validation.isValidPhone(this.phone);
    return !this.emailInvalid && !this.phoneInvalid;
  }

  onSubmit(form: NgForm): void {
    if (this.notFound || form.invalid || !this.validate()) {
      return;
    }

    const users = this.hotelState.users;
    const index = users.findIndex((u: any) => u.id === this.managerId);
    if (index === -1) {
      return;
    }

    const user = users[index];
    const branchName = this.hotels.find(h => h.id === this.assignedHotelId)?.name || 'N/A';

    user.firstName = this.firstName;
    user.lastName = this.lastName;
    user.name = `${this.firstName} ${this.lastName}`;
    user.email = this.email;
    user.phone = this.phone;
    user.assignedHotelId = this.assignedHotelId || null;
    user.branch = branchName;
    user.status = this.status;

    users[index] = user;
    this.hotelState.users = users;

    this.ui.showToast('Manager information updated successfully.', () => {
      // Assumption: no admin "view user detail" route exists yet in this
      // workspace (the users/ module is being built concurrently by another
      // agent), so we return to the users list rather than guessing a
      // view-user route/id param shape.
      this.router.navigate(['/admin/users']);
    });
  }
}
