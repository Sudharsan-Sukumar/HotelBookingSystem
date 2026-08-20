import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AdminTransactionDto } from '../../../core/models/payment.model';

/**
 * Payments & Refunds admin page — view-only. Wired to:
 *   GET /api/admin/payments?bookingId=&status=   (Features/Payments/Controllers/AdminPaymentsController.cs)
 *
 * Admins never manually create or confirm a payment, nor manually issue a refund — both actions
 * were removed (RefundsController's admin/override endpoint and AdminPaymentsController's manual
 * endpoint no longer exist). Any Razorpay-outage fallback lives entirely on the customer side
 * (payment-portal's gatewayUnavailable/sessionExpired states); this page only lets admins browse
 * transaction history.
 */
@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  private readonly paymentsBase = `${environment.apiUrl}/admin/payments`;

  transactions: AdminTransactionDto[] = [];
  isLoading = false;

  filterBookingId: number | null = null;
  filterStatus = 'all';

  currentPage = 1;
  rowsPerPage = 10;

  kpiTotal = 0;
  kpiCompleted = 0;
  kpiFailed = 0;
  kpiTotalAmount = 0;

  constructor(private http: HttpClient, private ui: GlobalUiService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.isLoading = true;
    let params = new HttpParams();
    if (this.filterBookingId != null && this.filterBookingId !== ('' as any)) {
      params = params.set('bookingId', this.filterBookingId);
    }
    if (this.filterStatus !== 'all') {
      params = params.set('status', this.filterStatus);
    }

    this.http.get<ApiResponse<AdminTransactionDto[]>>(this.paymentsBase, { params }).subscribe({
      next: res => {
        this.transactions = res.data || [];
        this.currentPage = 1;
        this.updateKpis();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.ui.showToast('Failed to load transactions.');
      }
    });
  }

  private updateKpis(): void {
    this.kpiTotal = this.transactions.length;
    this.kpiCompleted = this.transactions.filter(t => t.status?.toLowerCase() === 'completed').length;
    this.kpiFailed = this.transactions.filter(t => t.status?.toLowerCase() === 'failed').length;
    this.kpiTotalAmount = this.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  applyFilters(): void {
    this.loadTransactions();
  }

  resetFilters(): void {
    this.filterBookingId = null;
    this.filterStatus = 'all';
    this.loadTransactions();
  }

  get pagedTransactions(): AdminTransactionDto[] {
    const start = (this.currentPage - 1) * this.rowsPerPage;
    return this.transactions.slice(start, start + this.rowsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.transactions.length / this.rowsPerPage));
  }

  get paginationPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }
}
