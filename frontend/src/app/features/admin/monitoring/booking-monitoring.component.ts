import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminReservationsService } from '../../../core/services/admin-reservations.service';
import { AdminReservationRow } from '../../../core/models/admin-reservation.model';
import { RenderTickService } from '../../../core/services/render-tick.service';

interface DayActivity {
  dateStr: string;
  checkIns: AdminReservationRow[];
  checkOuts: AdminReservationRow[];
}

/**
 * Real-data port of the admin booking monitoring screen.
 *
 * The only admin-facing booking list is GET /api/reports/admin/hotel-reservations/{hotelId},
 * aggregated per-hotel here via AdminReservationsService. ReservationDetailDto now includes a
 * numeric booking `id` alongside `bookingCustomId`, so View navigates to a real route param
 * (/admin/monitoring/:bookingId) and Cancel drives POST /api/admin/bookings/{id}/cancel directly.
 * There is still no admin fetch-by-id endpoint — view-booking.component resolves the row from the
 * per-hotel report using the hotel context passed via router state (falling back to scanning every
 * hotel on a direct URL/refresh). No-Show has no backend equivalent and stays removed.
 */
@Component({
  selector: 'app-booking-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './booking-monitoring.component.html',
  styleUrls: ['./booking-monitoring.component.scss']
})
export class BookingMonitoringComponent implements OnInit {
  private reservationsApi = inject(AdminReservationsService);
  private ui = inject(GlobalUiService);
  private router = inject(Router);
  private renderTick = inject(RenderTickService);

  allBookings: AdminReservationRow[] = [];
  loading = true;

  activeTab: 'all' | 'calendar' | 'history' = 'all';

  filterBranch = 'all';
  // 'All Time' is the true no-filter default — 'This Month' used to sit here but the filter logic
  // never actually implemented a "this month" restriction, so it silently behaved as "all time"
  // while the label claimed otherwise. Now 'This Month' is a real, selectable, working filter.
  filterDateRange = 'All Time';
  filterStatus = 'all';
  searchQuery = '';

  currentPageAll = 1;
  currentPageHistory = 1;
  itemsPerPage = 8;

  kpiTotal = 0;
  kpiActive = 0;
  kpiConfirmed = 0;
  kpiPending = 0;

  currentCalDate = new Date();
  calendarDays: Array<{ day: number; dateStr: string; checkIns: AdminReservationRow[]; checkOuts: AdminReservationRow[] } | null> = [];
  calendarMonthTitle = '';
  selectedDay: DayActivity | null = null;

  branchCounts: Array<{ name: string; count: number }> = [];
  statusCounts: Array<{ name: string; count: number }> = [];

  showCancelModal = false;
  cancelTarget: AdminReservationRow | null = null;
  cancelReason = '';
  cancelReasonInvalid = false;
  cancelSubmitting = false;

  ngOnInit(): void {
    this.refreshAll();
  }

  getHotelName(b: AdminReservationRow): string {
    return b.hotelName;
  }

  getStatusBadgeClass(b: AdminReservationRow): string {
    switch (b.status) {
      case 'Confirmed': return 'bg-success';
      case 'CheckedIn': return 'bg-primary';
      case 'CheckedOut': return 'bg-secondary';
      case 'Completed': return 'bg-secondary';
      case 'Cancelled': return 'bg-danger';
      case 'Pending Payment':
      case 'Pending Additional Payment': return 'bg-warning text-dark';
      default: return 'bg-warning text-dark';
    }
  }

  getStatusLabel(b: AdminReservationRow): string {
    return b.status;
  }

  private filterData(data: AdminReservationRow[], includeHistory: boolean): AdminReservationRow[] {
    const q = this.searchQuery.toLowerCase().trim();
    return data.filter(b => {
      if (includeHistory) {
        if (!['CheckedOut', 'Completed', 'Cancelled'].includes(b.status)) return false;
      } else {
        if (this.filterStatus === 'all' && ['CheckedOut', 'Completed', 'Cancelled'].includes(b.status)) return false;
      }

      if (this.filterBranch !== 'all' && !b.hotelName.toLowerCase().includes(this.filterBranch.toLowerCase())) return false;

      // "Pending" (the dropdown option) doesn't equal any real booking status — the actual backend
      // values are "Pending Payment" and "Pending Additional Payment" — so an exact-equality check
      // against the literal string "Pending" always matched zero rows. Match by prefix instead.
      if (this.filterStatus !== 'all') {
        if (this.filterStatus === 'Pending') {
          if (!b.status.startsWith('Pending')) return false;
        } else if (b.status !== this.filterStatus) {
          return false;
        }
      }

      if (q) {
        if (!b.bookingCustomId.toLowerCase().includes(q) && !b.customerName.toLowerCase().includes(q)) return false;
      }

      const bDate = new Date(b.checkInDate);
      const today = new Date();
      if (this.filterDateRange === 'Today') {
        const todayStr = today.toISOString().split('T')[0];
        if (b.checkInDate.slice(0, 10) !== todayStr) return false;
      } else if (this.filterDateRange === 'Last 7 Days') {
        const diff = (today.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff < 0 || diff > 7) return false;
      } else if (this.filterDateRange === 'This Month') {
        // Previously a no-op: this branch didn't exist at all, so "This Month" silently behaved
        // as "All Time" regardless of what the dropdown showed.
        if (bDate.getFullYear() !== today.getFullYear() || bDate.getMonth() !== today.getMonth()) return false;
      }
      // 'All Time' (and any other value) applies no date restriction.

      return true;
    });
  }

  get filteredAllBookings(): AdminReservationRow[] {
    return this.filterData(this.allBookings, false);
  }

  get filteredHistory(): AdminReservationRow[] {
    return this.filterData(this.allBookings, true);
  }

  get pagedAllBookings(): AdminReservationRow[] {
    const filtered = this.filteredAllBookings;
    const start = (this.currentPageAll - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  get pagedHistory(): AdminReservationRow[] {
    const filtered = this.filteredHistory;
    const start = (this.currentPageHistory - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  totalPagesAll(): number {
    return Math.max(1, Math.ceil(this.filteredAllBookings.length / this.itemsPerPage));
  }

  totalPagesHistory(): number {
    return Math.max(1, Math.ceil(this.filteredHistory.length / this.itemsPerPage));
  }

  pageRange(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  goToPageAll(page: number): void { this.currentPageAll = page; }
  goToPageHistory(page: number): void { this.currentPageHistory = page; }

  applyFilters(): void {
    this.currentPageAll = 1;
    this.currentPageHistory = 1;
  }

  resetFilters(): void {
    this.filterBranch = 'all';
    this.filterStatus = 'all';
    this.filterDateRange = 'All Time';
    this.searchQuery = '';
    this.currentPageAll = 1;
    this.currentPageHistory = 1;
  }

  onSearchChange(): void { this.currentPageAll = 1; }

  onPageSizeChange(size: string): void {
    this.itemsPerPage = parseInt(size, 10);
    this.currentPageAll = 1;
    this.currentPageHistory = 1;
  }

  setTab(tab: 'all' | 'calendar' | 'history'): void {
    this.activeTab = tab;
    if (tab === 'calendar') this.renderCalendar();
  }

  viewBooking(b: AdminReservationRow): void {
    this.router.navigate(['/admin/monitoring', b.id], { state: { reservation: b, hotelId: b.hotelId } });
  }

  viewInvoice(b: AdminReservationRow): void {
    this.reservationsApi.downloadInvoice(b.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${b.bookingCustomId || b.id}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.ui.showToast('Invoice is only available for confirmed or completed bookings.');
      }
    });
  }

  canCancel(b: AdminReservationRow): boolean {
    return b.status !== 'Cancelled' && b.status !== 'Completed' && b.status !== 'CheckedOut';
  }

  openCancelModal(b: AdminReservationRow): void {
    this.cancelTarget = b;
    this.cancelReason = '';
    this.cancelReasonInvalid = false;
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelTarget = null;
  }

  confirmCancel(): void {
    const reason = this.cancelReason.trim();
    if (reason.length < 10) {
      this.cancelReasonInvalid = true;
      return;
    }
    this.cancelReasonInvalid = false;

    const target = this.cancelTarget;
    if (!target) return;

    this.cancelSubmitting = true;
    this.reservationsApi.cancelBooking(target.id, { reason }).subscribe({
      next: () => {
        this.cancelSubmitting = false;
        this.showCancelModal = false;
        this.cancelTarget = null;
        this.ui.showToast('Booking cancelled successfully.');
        this.refreshAll();
      },
      error: (err) => {
        this.cancelSubmitting = false;
        this.ui.showToast(err?.error?.message || 'Failed to cancel booking.');
      }
    });
  }

  private updateKPIs(data: AdminReservationRow[]): void {
    this.kpiTotal = data.length;
    this.kpiActive = data.filter(b => !['CheckedOut', 'Completed', 'Cancelled'].includes(b.status)).length;
    this.kpiConfirmed = data.filter(b => b.status === 'Confirmed').length;
    this.kpiPending = data.filter(b => b.status === 'Pending Payment' || b.status === 'Pending Additional Payment').length;
  }

  private renderStats(data: AdminReservationRow[]): void {
    const branchMap: Record<string, number> = {};
    data.forEach(b => {
      const name = b.hotelName.replace('Elegant Enclave ', '');
      branchMap[name] = (branchMap[name] || 0) + 1;
    });
    this.branchCounts = Object.entries(branchMap).map(([name, count]) => ({ name, count }));

    const statusMap: Record<string, number> = {};
    data.forEach(b => { statusMap[b.status] = (statusMap[b.status] || 0) + 1; });
    this.statusCounts = Object.entries(statusMap).map(([name, count]) => ({ name, count }));
  }

  renderCalendar(): void {
    const year = this.currentCalDate.getFullYear();
    const month = this.currentCalDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.calendarMonthTitle = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; checkIns: AdminReservationRow[]; checkOuts: AdminReservationRow[] } | null> = [];
    for (let i = 0; i < firstDay; i++) days.push(null);

    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const checkIns = this.allBookings.filter(b => b.checkInDate.slice(0, 10) === dStr && b.status !== 'Cancelled');
      const checkOuts = this.allBookings.filter(b => b.checkOutDate.slice(0, 10) === dStr && b.status !== 'Cancelled');
      days.push({ day: d, dateStr: dStr, checkIns, checkOuts });
    }
    this.calendarDays = days;
  }

  prevMonth(): void {
    this.currentCalDate = new Date(this.currentCalDate.getFullYear(), this.currentCalDate.getMonth() - 1, 1);
    this.renderCalendar();
  }

  nextMonth(): void {
    this.currentCalDate = new Date(this.currentCalDate.getFullYear(), this.currentCalDate.getMonth() + 1, 1);
    this.renderCalendar();
  }

  showDayDetails(day: { dateStr: string; checkIns: AdminReservationRow[]; checkOuts: AdminReservationRow[] } | null): void {
    if (!day) return;
    this.selectedDay = { dateStr: day.dateStr, checkIns: day.checkIns, checkOuts: day.checkOuts };
  }

  getGuestName(b: AdminReservationRow): string {
    return b.customerName;
  }

  refreshAll(): void {
    this.loading = true;
    this.reservationsApi.getAllReservations().subscribe({
      next: rows => {
        this.allBookings = rows;
        this.loading = false;
        const filtered = this.filterData(this.allBookings, false);
        this.updateKPIs(this.allBookings);
        this.renderStats(filtered);
        if (this.activeTab === 'calendar') this.renderCalendar();
        // getAllReservations() fans out to one HTTP request per hotel via forkJoin. The error
        // interceptor's centralized RenderTickService.requestTick() (see its doc comment) fires
        // per raw HTTP request as each one completes — for a forkJoin that's before this next()
        // callback runs, so the tick that actually matters (the one after allBookings/loading are
        // set) never happens and the view is stuck showing the old "Loading..." state forever.
        this.renderTick.requestTick();
      },
      error: () => {
        this.loading = false;
        this.renderTick.requestTick();
      }
    });
  }

  exportReport(format: 'PDF' | 'Excel' | 'CSV'): void {
    if (format === 'CSV') {
      const filtered = this.filteredHistory;
      const csvString = 'Booking ID,Customer,Hotel,Room Type,Check-In,Check-Out,Status,Amount\n' +
        filtered.map(b => `"${b.bookingCustomId}","${b.customerName}","${b.hotelName}","${b.roomTypeName}","${b.checkInDate}","${b.checkOutDate}","${b.status}",${b.amount}`).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      this.triggerDownload(blob, `Booking_History_${new Date().toISOString().slice(0, 10)}.csv`);
      this.ui.showToast('CSV downloaded successfully.');
    } else {
      this.ui.showToast(`${format} export is not available — only CSV export is backed by real data.`);
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
