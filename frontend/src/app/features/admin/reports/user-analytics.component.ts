import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { AdminUserDto } from '../../../core/models/admin-user.model';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CustomerActivityReportDto } from '../../../core/models/report.model';
import { ReportExportService } from '../../../core/services/report-export.service';

/**
 * The backend has no aggregate "all users" analytics endpoint (no per-role/per-status counts,
 * no registration-trend series) — only GET api/reports/admin/customer-activity/{customerId}
 * (AdminReportsController.GetCustomerActivityReport), which reports on one customer at a time.
 * This screen is therefore a customer-activity lookup by customer/user id. The default-view
 * users list below reuses the existing GET api/admin/users list (same one Admin > Users uses)
 * purely so there's something to browse/pick from before you know an ID to search for.
 */
@Component({
  selector: 'app-user-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './user-analytics.component.html',
  styleUrls: ['./user-analytics.component.scss']
})
export class UserAnalyticsComponent implements OnInit {
  private http = inject(HttpClient);
  private ui = inject(GlobalUiService);
  private exportService = inject(ReportExportService);
  private usersService = inject(AdminUsersService);
  private readonly base = `${environment.apiUrl}/reports/admin`;

  customerId: number | null = null;
  activity: CustomerActivityReportDto | null = null;
  loading = false;
  notFound = false;

  allUsers: AdminUserDto[] = [];
  loadingUsers = false;

  currentPage = 1;
  rowsPerPage = 10;

  ngOnInit(): void {
    this.loadAllUsers();
  }

  loadAllUsers(): void {
    this.loadingUsers = true;
    this.usersService.getAllUsers().subscribe({
      next: res => {
        this.allUsers = res.data || [];
        this.currentPage = 1;
        this.loadingUsers = false;
      },
      error: () => {
        this.loadingUsers = false;
        this.ui.showToast('Failed to load the user list.');
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.allUsers.length / this.rowsPerPage));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedUsers(): AdminUserDto[] {
    const start = (this.currentPage - 1) * this.rowsPerPage;
    return this.allUsers.slice(start, start + this.rowsPerPage);
  }

  get startIndex(): number {
    return this.allUsers.length === 0 ? 0 : (this.currentPage - 1) * this.rowsPerPage + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.rowsPerPage, this.allUsers.length);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  prevPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  onRowsPerPageChange(): void {
    this.currentPage = 1;
  }

  viewActivityFor(u: AdminUserDto): void {
    this.customerId = u.id;
    this.search();
  }

  search(): void {
    if (!this.customerId) {
      this.ui.showToast('Enter a customer/user ID to search');
      return;
    }
    this.loading = true;
    this.notFound = false;
    this.activity = null;
    this.http.get<ApiResponse<CustomerActivityReportDto>>(`${this.base}/customer-activity/${this.customerId}`).subscribe({
      next: res => {
        this.activity = res.data;
        this.loading = false;
      },
      error: () => {
        this.notFound = true;
        this.loading = false;
      }
    });
  }

  reset(): void {
    this.customerId = null;
    this.activity = null;
    this.notFound = false;
  }

  exportPDF(): void {
    if (!this.activity) {
      this.ui.showToast('Search for a customer before exporting a report');
      return;
    }
    const a = this.activity;
    this.exportService.exportPdf({
      fileName: `user-analytics-${a.customerCustomId || this.customerId}`,
      title: 'User Analytics',
      filterSummary: `Customer / User ID: ${this.customerId}`,
      kpis: [
        { label: 'Total Bookings', value: `${a.totalBookings}` },
        { label: 'Total Spend', value: `Rs. ${a.totalSpend.toLocaleString('en-IN')}` },
        { label: 'Cancellations', value: `${a.cancellations}` },
        { label: 'Reviews Submitted', value: `${a.reviewsSubmitted}` }
      ],
      headers: ['Field', 'Value'],
      rows: [
        ['Customer ID', a.customerCustomId || '-'],
        ['Name', a.fullName],
        ['Email', a.email],
        ['Registration Date', new Date(a.registrationDate).toLocaleDateString()]
      ]
    });
  }
}
