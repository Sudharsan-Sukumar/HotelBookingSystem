import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerReportsService } from '../../../core/services/customer-reports.service';
import { CustomerTransactionReportDto } from '../../../core/models/customer-report.model';

/** Row-level display info derived client-side from CustomerTransactionReportDto.type,
 *  which is server-computed as "Refund" when the underlying payment status is "Refunded",
 *  else "Payment" (see Features/Reports/DTOs/CustomerTransactionReportDto.cs). */
interface TransactionRow {
  transaction: CustomerTransactionReportDto;
  typeBadgeClass: string;
  statusBadgeClass: string;
  formattedAmount: string;
}

function typeBadgeClassFor(type: string): string {
  return type === 'Refund'
    ? 'badge bg-danger text-white px-3 py-2 rounded-pill'
    : 'badge bg-success text-white px-3 py-2 rounded-pill';
}

function statusBadgeClassFor(status: string): string {
  switch (status) {
    case 'Success':
    case 'Completed':
    case 'Refunded': return 'badge bg-success text-white px-3 py-2 rounded-pill';
    case 'Pending': return 'badge bg-warning text-dark px-3 py-2 rounded-pill';
    case 'Failed': return 'badge bg-danger text-white px-3 py-2 rounded-pill';
    default: return 'badge bg-secondary text-white px-3 py-2 rounded-pill';
  }
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  isLoading = true;
  loadError = '';

  private allTransactions: CustomerTransactionReportDto[] = [];
  rows: TransactionRow[] = [];

  startDate = '';
  endDate = '';

  constructor(
    private auth: AuthService,
    private reportsService: CustomerReportsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn || this.auth.userRole !== 'Customer') {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadTransactions();
  }

  private loadTransactions(): void {
    this.isLoading = true;
    this.loadError = '';
    this.reportsService.getTransactions(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (res) => {
        this.allTransactions = res.data || [];
        this.isLoading = false;
        this.renderRows();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Could not load your transaction history right now. Please try again later.';
      }
    });
  }

  private renderRows(): void {
    this.rows = this.allTransactions.map(t => ({
      transaction: t,
      typeBadgeClass: typeBadgeClassFor(t.type),
      statusBadgeClass: statusBadgeClassFor(t.status),
      formattedAmount: t.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
    }));
  }

  applyDateFilter(): void {
    this.loadTransactions();
  }

  resetDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadTransactions();
  }
}
