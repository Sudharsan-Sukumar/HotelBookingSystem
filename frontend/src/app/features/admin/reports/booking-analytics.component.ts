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
import { HotelResponseDto } from '../../../core/models/hotel.model';
import { ReportExportService } from '../../../core/services/report-export.service';

/**
 * Wired to GET api/reports/admin/system-bookings (AdminReportsController.GetSystemWideBookingsReport).
 * The per-room-type breakdown from the original mock port has no backend equivalent (the DTO only
 * reports totals per hotel), so this view now shows booking/revenue/cancellation/occupancy per hotel.
 */
@Component({
  selector: 'app-booking-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './booking-analytics.component.html',
  styleUrls: ['./booking-analytics.component.scss']
})
export class BookingAnalyticsComponent implements OnInit {
  private http = inject(HttpClient);
  private ui = inject(GlobalUiService);
  private exportService = inject(ReportExportService);
  private readonly base = `${environment.apiUrl}/reports/admin`;

  hotels: HotelResponseDto[] = [];
  filterHotelId: number | 'all' = 'all';
  filterStartDate = '';
  filterEndDate = '';

  currentPage = 1;
  itemsPerPage = 3;

  totalBookings = 0;
  totalRevenue = 0;
  cancelRate = 0;
  avgOccupancyRate = 0;

  hotelPerformances: HotelPerformanceDto[] = [];
  loading = false;

  ngOnInit(): void {
    this.http.get<ApiResponse<HotelResponseDto[]>>(`${environment.apiUrl}/hotels`).subscribe({
      next: res => { this.hotels = res.data || []; },
      error: () => { this.hotels = []; }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    let url = `${this.base}/system-bookings?`;
    const params: string[] = [];
    if (this.filterHotelId !== 'all') params.push(`hotelId=${this.filterHotelId}`);
    if (this.filterStartDate) params.push(`startDate=${this.filterStartDate}`);
    if (this.filterEndDate) params.push(`endDate=${this.filterEndDate}`);
    url += params.join('&');

    this.http.get<ApiResponse<SystemWideBookingsReportDto>>(url).subscribe({
      next: res => {
        const d = res.data;
        this.totalBookings = d.totalBookings;
        this.totalRevenue = d.totalRevenue;
        this.cancelRate = Math.round(d.systemCancellationRate);
        this.avgOccupancyRate = Math.round(d.averageOccupancyRate);
        this.hotelPerformances = d.hotelPerformances || [];
        const totalPages = Math.ceil(this.hotelPerformances.length / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loading = false;
      },
      error: () => {
        this.hotelPerformances = [];
        this.loading = false;
        this.ui.showToast('Failed to load booking analytics');
      }
    });
  }

  get pagedHotelPerformances(): HotelPerformanceDto[] {
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
    this.filterHotelId = 'all'; this.filterStartDate = ''; this.filterEndDate = '';
    this.currentPage = 1; this.load();
  }

  private buildExportSpec() {
    const hotelName = this.filterHotelId === 'all' ? 'All Hotels' : (this.hotels.find(h => h.id === this.filterHotelId)?.name || 'All Hotels');
    const filterSummary = `Hotel: ${hotelName} | ${this.filterStartDate || 'All time'} to ${this.filterEndDate || 'Present'}`;
    return {
      fileName: 'booking-analytics',
      title: 'Booking Analytics',
      filterSummary,
      kpis: [
        { label: 'Total Bookings', value: `${this.totalBookings}` },
        { label: 'Total Revenue', value: `Rs. ${this.totalRevenue.toLocaleString('en-IN')}` },
        { label: 'Cancel Rate', value: `${this.cancelRate}%` },
        { label: 'Avg Occupancy', value: `${this.avgOccupancyRate}%` }
      ],
      headers: ['Hotel', 'Bookings', 'Revenue', 'Cancellation Rate', 'Occupancy Rate'],
      rows: this.hotelPerformances.map(hp => [
        hp.hotelName,
        `${hp.bookingsCount}`,
        `Rs. ${hp.revenue.toLocaleString('en-IN')}`,
        `${hp.cancellationRate.toFixed(1)}%`,
        `${hp.occupancyRate.toFixed(1)}%`
      ])
    };
  }

  exportPDF(): void { this.exportService.exportPdf(this.buildExportSpec()); }
  exportExcel(): void { this.exportService.exportCsv(this.buildExportSpec()); }
}
