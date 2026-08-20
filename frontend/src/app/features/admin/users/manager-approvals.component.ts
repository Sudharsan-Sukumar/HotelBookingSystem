import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { ManagerDto } from '../../../core/models/admin-user.model';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';

/**
 * New screen: pending manager registration queue.
 * Wired to Users/Controllers/AdminApprovalController.cs —
 * GET api/admin/approvals/managers/pending, PUT .../approve, PUT .../reject.
 * RejectManager takes no body, so reject needs no reason prompt.
 */
@Component({
  selector: 'app-manager-approvals',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminTopNavComponent],
  templateUrl: './manager-approvals.component.html',
  styleUrls: ['./manager-approvals.component.scss']
})
export class ManagerApprovalsComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);
  private readonly ui = inject(GlobalUiService);

  pendingManagers = signal<ManagerDto[]>([]);
  loading = signal(false);
  actioningId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.usersService.getPendingManagers().subscribe({
      next: res => {
        this.pendingManagers.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.ui.showToast('Failed to load pending manager approvals.');
      }
    });
  }

  createdDisplay(m: ManagerDto): string {
    return m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '-';
  }

  approve(id: number): void {
    this.actioningId.set(id);
    this.usersService.approveManager(id).subscribe({
      next: () => {
        this.ui.showToast('Manager approved successfully.');
        this.actioningId.set(null);
        this.load();
      },
      error: err => {
        this.actioningId.set(null);
        this.ui.showToast(err?.error?.message || 'Failed to approve manager.');
      }
    });
  }

  reject(id: number): void {
    if (!confirm('Reject this manager registration? This action cannot be undone.')) return;
    this.actioningId.set(id);
    this.usersService.rejectManager(id).subscribe({
      next: () => {
        this.ui.showToast('Manager rejected successfully.');
        this.actioningId.set(null);
        this.load();
      },
      error: err => {
        this.actioningId.set(null);
        this.ui.showToast(err?.error?.message || 'Failed to reject manager.');
      }
    });
  }
}
