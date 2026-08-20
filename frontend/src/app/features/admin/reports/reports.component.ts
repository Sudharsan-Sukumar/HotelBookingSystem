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
 * Revenue Analytics landing page, wired to GET api/reports/admin/system-bookings
 * (AdminReportsController.GetSystemWideBookingsReport) — the only admin report-level summary
 * endpoint. The original mock port's monthly revenue trend and per-category filter have no
 * backend equivalent (no time-series or category breakdown in the DTO) and have been removed;
 * this now shows the real system totals plus a per-hotel revenue table.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private ui = inject(GlobalUiService);
  private exportService = inject(ReportExportService);
  private readonly base = `${environment.apiUrl}/reports/admin`;

  filterStartDate = '';
  filterEndDate = '';

  currentPage = 1;
  itemsPerPage = 2;

  kpiTotalRevenue = 0;
  kpiTotalBookings = 0;
  kpiAvgOccupancy = 0;
  kpiCancellationRate = 0;
  kpiTopHotelName = 'N/A';
  kpiTopHotelRevenue = 0;

  hotelRows: HotelPerformanceDto[] = [];
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
        this.kpiTotalRevenue = d.totalRevenue;
        this.kpiTotalBookings = d.totalBookings;
        this.kpiAvgOccupancy = Math.round(d.averageOccupancyRate);
        this.kpiCancellationRate = Math.round(d.systemCancellationRate);
        this.hotelRows = d.hotelPerformances || [];

        let topName = 'N/A', topRev = 0;
        for (const hp of this.hotelRows) {
          if (hp.revenue >= topRev) { topRev = hp.revenue; topName = hp.hotelName; }
        }
        this.kpiTopHotelName = topName;
        this.kpiTopHotelRevenue = topRev;

        const totalPages = Math.ceil(this.hotelRows.length / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loading = false;
      },
      error: () => {
        this.hotelRows = [];
        this.loading = false;
        this.ui.showToast('Failed to load revenue analytics');
      }
    });
  }

  get pagedHotelRows(): HotelPerformanceDto[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.hotelRows.slice(start, start + this.itemsPerPage);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.hotelRows.length / this.itemsPerPage));
  }

  pageRange(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  goToPage(p: number): void {
    this.currentPage = p;
  }

  onPageSizeChange(size: string): void {
    this.itemsPerPage = parseInt(size, 10);
    this.currentPage = 1;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  resetFilters(): void {
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.currentPage = 1;
    this.load();
  }

  private buildExportSpec() {
    const filterSummary = `${this.filterStartDate || 'All time'} to ${this.filterEndDate || 'Present'}`;
    return {
      fileName: 'revenue-analytics',
      title: 'Revenue Analytics',
      filterSummary,
      kpis: [
        { label: 'Total Revenue', value: `Rs. ${this.kpiTotalRevenue.toLocaleString('en-IN')}` },
        { label: 'Total Bookings', value: `${this.kpiTotalBookings}` },
        { label: 'Avg Occupancy', value: `${this.kpiAvgOccupancy}%` },
        { label: 'Top Hotel', value: this.kpiTopHotelName }
      ],
      headers: ['Branch', 'Bookings', 'Revenue', 'Cancellation Rate', 'Occupancy Rate'],
      rows: this.hotelRows.map(row => [
        row.hotelName,
        `${row.bookingsCount}`,
        `Rs. ${row.revenue.toLocaleString('en-IN')}`,
        `${row.cancellationRate.toFixed(1)}%`,
        `${row.occupancyRate.toFixed(1)}%`
      ])
    };
  }

  exportPDF(): void {
    this.exportService.exportPdf(this.buildExportSpec());
  }

  exportExcel(): void {
    this.exportService.exportCsv(this.buildExportSpec());
  }
}
