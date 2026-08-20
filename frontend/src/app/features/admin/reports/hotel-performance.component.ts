import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { SystemWideBookingsReportDto, HotelPerformanceDto } from '../../../core/models/report.model';
import { ReportExportService } from '../../../core/services/report-export.service';

/**
 * Wired to GET api/reports/admin/system-bookings (AdminReportsController.GetSystemWideBookingsReport),
 * which returns per-hotel totals. The original mock port's "Top Room Type" and per-room occupancy
 * (fakeOcc) had no real backend equivalent at this aggregate level and have been removed — the DTO's
 * occupancyRate/cancellationRate/revenue/bookingsCount fields are shown instead.
 */
@Component({
  selector: 'app-hotel-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './hotel-performance.component.html',
  styleUrls: ['./hotel-performance.component.scss']
})
export class HotelPerformanceComponent implements OnInit {
  private http = inject(HttpClient);
  private ui = inject(GlobalUiService);
  private exportService = inject(ReportExportService);
  private readonly base = `${environment.apiUrl}/reports/admin`;

  filterStartDate = '';
  filterEndDate = '';

  currentPage = 1;
  itemsPerPage = 2;

  kpiBestBranch = 'N/A';
  kpiBestBranchRevenue = 0;
  kpiOccRate = 0;
  kpiTotalBookings = 0;

  hotelPerformances: HotelPerformanceDto[] = [];
  loading = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    let url = `${this.base}/system-bookings?`;
    const params: string[] = [];
    if (this.filterStartDate) params.push(`startDate=${this.filterStartDate}`);
    if (this.filterEndDate) params.push(`endDate=${this.filterEndDate}`);
    url += params.join('&');

    this.http.get<ApiResponse<SystemWideBookingsReportDto>>(url).subscribe({
      next: res => {
        const d = res.data;
        this.hotelPerformances = d.hotelPerformances || [];
        this.kpiTotalBookings = d.totalBookings;
        this.kpiOccRate = Math.round(d.averageOccupancyRate);

        let topHotelName = 'N/A', topHotelRev = 0;
        for (const hp of this.hotelPerformances) {
          if (hp.revenue >= topHotelRev) { topHotelRev = hp.revenue; topHotelName = hp.hotelName; }
        }
        this.kpiBestBranch = topHotelName;
        this.kpiBestBranchRevenue = topHotelRev;

        const totalPages = Math.ceil(this.hotelPerformances.length / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loading = false;
      },
      error: () => {
        this.hotelPerformances = [];
        this.loading = false;
        this.ui.showToast('Failed to load hotel performance');
      }
    });
  }

  get pagedRows(): HotelPerformanceDto[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.hotelPerformances.slice(start, start + this.itemsPerPage);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.hotelPerformances.length / this.itemsPerPage));
  }

  pageRange(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  goToPage(p: number): void { this.currentPage = p; }

  onPageSizeChange(size: string): void {
    this.itemsPerPage = parseInt(size, 10);
    this.currentPage = 1;
  }

  applyFilters(): void { this.currentPage = 1; this.load(); }

  resetFilters(): void {
    this.filterStartDate = ''; this.filterEndDate = '';
    this.currentPage = 1; this.load();
  }

  private buildExportSpec() {
    const filterSummary = `${this.filterStartDate || 'All time'} to ${this.filterEndDate || 'Present'}`;
    return {
      fileName: 'hotel-performance',
      title: 'Hotel Performance Analytics',
      filterSummary,
      kpis: [
        { label: 'Best Branch', value: this.kpiBestBranch },
        { label: 'Occupancy Rate', value: `${this.kpiOccRate}%` },
        { label: 'Total Bookings', value: `${this.kpiTotalBookings}` }
      ],
      headers: ['Branch', 'Occupancy %', 'Revenue', 'Bookings', 'Cancellation Rate'],
      rows: this.hotelPerformances.map(st => [
        st.hotelName,
        `${st.occupancyRate.toFixed(1)}%`,
        `Rs. ${st.revenue.toLocaleString('en-IN')}`,
        `${st.bookingsCount}`,
        `${st.cancellationRate.toFixed(1)}%`
      ])
    };
  }

  exportPDF(): void { this.exportService.exportPdf(this.buildExportSpec()); }
  exportExcel(): void { this.exportService.exportCsv(this.buildExportSpec()); }
}
