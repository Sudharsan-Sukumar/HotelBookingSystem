import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuditLog } from '../../../core/models/audit-log.model';

/**
 * Audit Log admin page.
 * Wired to Users/Controllers/AdminAuditController.cs:
 *   GET /api/AdminAudit           -> all logs
 *   GET /api/AdminAudit/user/{id} -> logs for one user (used by the "changed-by" filter)
 * The backend returns the full list with no server-side pagination, so pagination
 * is client-side, matching the .admin-pagination pattern used elsewhere in admin.
 */
@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss']
})
export class AuditLogComponent implements OnInit {
  private readonly base = `${environment.apiUrl}/AdminAudit`;

  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  isLoading = false;

  filterEntity = 'all';
  filterAction = 'all';
  filterUserId: number | null = null;

  currentPage = 1;
  rowsPerPage = 10;

  constructor(private http: HttpClient, private ui: GlobalUiService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    this.http.get<ApiResponse<AuditLog[]>>(this.base).subscribe({
      next: res => {
        this.logs = (res.data || []).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.isLoading = false;
        this.applyFilters();
      },
      error: () => {
        this.isLoading = false;
        this.ui.showToast('Failed to load audit logs.');
      }
    });
  }

  loadByUser(): void {
    if (this.filterUserId == null) {
      this.loadAll();
      return;
    }
    this.isLoading = true;
    this.http.get<ApiResponse<AuditLog[]>>(`${this.base}/user/${this.filterUserId}`).subscribe({
      next: res => {
        this.logs = (res.data || []).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.isLoading = false;
        this.currentPage = 1;
        this.applyClientFilters();
      },
      error: () => {
        this.isLoading = false;
        this.ui.showToast('Failed to load audit logs for this user.');
      }
    });
  }

  get entityOptions(): string[] {
    return Array.from(new Set(this.logs.map(l => l.entityName))).sort();
  }

  get actionOptions(): string[] {
    return Array.from(new Set(this.logs.map(l => l.action))).sort();
  }

  private applyClientFilters(): void {
    this.filteredLogs = this.logs.filter(l => {
      if (this.filterEntity !== 'all' && l.entityName !== this.filterEntity) return false;
      if (this.filterAction !== 'all' && l.action !== this.filterAction) return false;
      return true;
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.applyClientFilters();
  }

  resetFilters(): void {
    this.filterEntity = 'all';
    this.filterAction = 'all';
    this.filterUserId = null;
    this.currentPage = 1;
    this.loadAll();
  }

  changedByLabel(log: AuditLog): string {
    if (!log.changedByUser) return 'System';
    return `${log.changedByUser.firstName} ${log.changedByUser.lastName}`.trim() || log.changedByUser.email;
  }

  get pagedLogs(): AuditLog[] {
    const start = (this.currentPage - 1) * this.rowsPerPage;
    return this.filteredLogs.slice(start, start + this.rowsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.rowsPerPage));
  }

  get paginationPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }
}
