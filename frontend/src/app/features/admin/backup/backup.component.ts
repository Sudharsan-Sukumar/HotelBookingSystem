import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { DatabaseBackup } from '../../../core/models/backup.model';

/**
 * Backup & Recovery admin page.
 * Wired to the real Features/CMS/Controllers/DatabaseBackupsController.cs:
 *   GET    /api/DatabaseBackups          -> list
 *   POST   /api/DatabaseBackups/trigger  -> create a backup now (synchronous; returns final record)
 *   POST   /api/DatabaseBackups/{id}/restore -> restore a backup (synchronous; no body, no polling endpoint)
 * The backend has no status/progress field to poll (TriggerBackup and RestoreBackup both
 * complete and return their final result in one call), so the progress overlay is shown
 * as a short indeterminate "working..." state purely for UX continuity with the existing
 * markup, then replaced by the real success/failure outcome.
 */
@Component({
  selector: 'app-admin-backup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './backup.component.html',
  styleUrls: ['./backup.component.scss']
})
export class BackupComponent implements OnInit {
  private readonly base = `${environment.apiUrl}/DatabaseBackups`;

  backups: DatabaseBackup[] = [];
  filteredBackups: DatabaseBackup[] = [];
  pagedBackups: DatabaseBackup[] = [];

  filterType = 'all';
  filterDateStart = '';
  filterDateEnd = '';

  currentPage = 1;
  rowsPerPage = 5;
  totalPages = 1;

  kpiLastBackup = 'Never';
  kpiLastBackupDate = '-';
  kpiTotalBackups = 0;
  kpiLastStatus = '-';

  isLoading = false;

  // Create-backup / restore progress overlays
  isBackingUp = false;
  isRestoring = false;
  progressPercent = 0;
  stageTitle = '';
  stageDesc = '';

  // Confirm-create-backup modal
  showConfirmCreateModal = false;

  // Restore confirm modal
  showRestoreConfirmModal = false;
  restoreTargetId: number | null = null;
  restoreTargetLabel = '';
  restoreConsent = false;
  restoreConsentError = '';

  constructor(private http: HttpClient, private ui: GlobalUiService) {}

  ngOnInit(): void {
    this.loadBackups();
  }

  // ---- Data loading ----

  loadBackups(): void {
    this.isLoading = true;
    this.http.get<ApiResponse<DatabaseBackup[]>>(this.base).subscribe({
      next: res => {
        this.backups = res.data || [];
        this.isLoading = false;
        this.renderTable();
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Failed to load backup history.');
      }
    });
  }

  // ---- Table rendering / filtering / pagination ----

  renderTable(): void {
    const sorted = [...this.backups].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.filteredBackups = sorted.filter(b => {
      if (this.filterType !== 'all' && b.backupType !== this.filterType) return false;
      if (this.filterDateStart || this.filterDateEnd) {
        const bDate = new Date(b.createdAt);
        if (this.filterDateStart && bDate < new Date(this.filterDateStart)) return false;
        if (this.filterDateEnd) {
          const endDate = new Date(this.filterDateEnd);
          endDate.setHours(23, 59, 59, 999);
          if (bDate > endDate) return false;
        }
      }
      return true;
    });

    this.kpiTotalBackups = this.backups.length;
    if (sorted.length > 0) {
      this.kpiLastBackup = new Date(sorted[0].createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) + ' IST';
      this.kpiLastBackupDate = sorted[0].fileName;
      this.kpiLastStatus = sorted[0].status;
    } else {
      this.kpiLastBackup = 'Never';
      this.kpiLastBackupDate = '-';
      this.kpiLastStatus = '-';
    }

    this.totalPages = Math.max(1, Math.ceil(this.filteredBackups.length / this.rowsPerPage));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    const start = (this.currentPage - 1) * this.rowsPerPage;
    this.pagedBackups = this.filteredBackups.slice(start, start + this.rowsPerPage);
  }

  get paginationPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showPagination(): boolean {
    return this.filteredBackups.length > 0;
  }

  get startItem(): number {
    return this.filteredBackups.length === 0 ? 0 : (this.currentPage - 1) * this.rowsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.rowsPerPage, this.filteredBackups.length);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.renderTable();
  }

  onPageSizeChange(size: string): void {
    this.rowsPerPage = parseInt(size, 10);
    this.currentPage = 1;
    this.renderTable();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.renderTable();
  }

  resetFilters(): void {
    this.filterType = 'all';
    this.filterDateStart = '';
    this.filterDateEnd = '';
    this.currentPage = 1;
    this.renderTable();
  }

  // ---- Toast helper ----

  private showToast(message: string): void {
    this.ui.showToast(message);
  }

  // ---- Create Backup Now flow ----

  openCreateBackupConfirm(): void {
    this.showConfirmCreateModal = true;
  }

  cancelCreateBackup(): void {
    this.showConfirmCreateModal = false;
  }

  confirmCreateBackup(): void {
    this.showConfirmCreateModal = false;
    this.isBackingUp = true;
    this.progressPercent = 40;
    this.stageTitle = 'Creating Backup...';
    this.stageDesc = 'Requesting a new backup from the server...';

    this.http.post<ApiResponse<DatabaseBackup>>(`${this.base}/trigger`, {}).subscribe({
      next: res => {
        this.progressPercent = 100;
        const rec = res.data;
        const failed = rec && rec.status && rec.status.toLowerCase() !== 'completed';
        this.stageTitle = failed ? 'Backup Failed' : 'Backup Completed Successfully';
        this.stageDesc = failed ? 'The backup did not complete successfully.' : (res.message || 'Backup created.');
        setTimeout(() => {
          this.isBackingUp = false;
          this.showToast(failed ? 'Backup failed.' : 'Backup created successfully.');
          this.loadBackups();
        }, 900);
      },
      error: err => {
        this.progressPercent = 100;
        this.stageTitle = 'Backup Failed';
        this.stageDesc = err?.error?.message || 'Could not create backup.';
        setTimeout(() => {
          this.isBackingUp = false;
          this.showToast('Failed to create backup.');
        }, 900);
      }
    });
  }

  // ---- Restore flow ----

  requestRestore(b: DatabaseBackup): void {
    this.restoreTargetId = b.id;
    this.restoreTargetLabel = `${b.backupId} (${b.fileName})`;
    this.restoreConsent = false;
    this.restoreConsentError = '';
    this.showRestoreConfirmModal = true;
  }

  cancelRestoreConfirm(): void {
    this.showRestoreConfirmModal = false;
    this.restoreTargetId = null;
  }

  submitRestoreConfirm(): void {
    this.restoreConsentError = '';
    if (!this.restoreConsent) {
      this.restoreConsentError = 'Please tick this box if you want to proceed.';
      return;
    }
    if (this.restoreTargetId == null) return;

    const id = this.restoreTargetId;
    this.showRestoreConfirmModal = false;
    this.isRestoring = true;
    this.progressPercent = 40;
    this.stageTitle = 'Restoring Backup...';
    this.stageDesc = 'Requesting restore from the server...';

    this.http.post<ApiResponse<null>>(`${this.base}/${id}/restore`, {}).subscribe({
      next: res => {
        this.progressPercent = 100;
        this.stageTitle = 'System Restored Successfully';
        this.stageDesc = res.message || 'Backup restored.';
        setTimeout(() => {
          this.isRestoring = false;
          this.showToast('Backup restored successfully.');
          this.loadBackups();
        }, 900);
      },
      error: err => {
        this.progressPercent = 100;
        this.stageTitle = 'Restore Failed';
        this.stageDesc = err?.error?.message || 'Could not restore this backup.';
        setTimeout(() => {
          this.isRestoring = false;
          this.showToast(err?.error?.message || 'Failed to restore backup.');
        }, 900);
      }
    });
  }
}
