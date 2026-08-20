import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { AdminUserDto } from '../../../core/models/admin-user.model';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';

type TabKey = 'all' | 'Customer' | 'Manager' | 'Pending';

/**
 * Wired to the real backend: GET/DELETE api/admin/users and the ban/unban
 * endpoints under api/admin/bans. Lists system users with tab/search/role/status
 * filtering and pagination. The former mock-data "Guests" tab has been removed
 * since it had no backing endpoint in scope.
 */
@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);
  private readonly ui = inject(GlobalUiService);
  private readonly router = inject(Router);

  users = signal<AdminUserDto[]>([]);
  loading = signal(false);

  activeTab = signal<TabKey>('all');
  searchTerm = signal('');
  roleFilter = signal('all');
  statusFilter = signal('all');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  deleteTargetId = signal<number | null>(null);
  deleteReason = signal('');
  deleteReasonInvalid = signal(false);
  showDeleteModal = signal(false);

  banTargetId = signal<number | null>(null);
  banMode = signal<'ban' | 'unban'>('ban');
  banReason = signal('');
  banReasonInvalid = signal(false);
  showBanModal = signal(false);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService.getAllUsers().subscribe({
      next: res => {
        this.users.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.ui.showToast('Failed to load users.');
      }
    });
  }

  get kpiTotal(): number { return this.users().length; }
  get kpiCustomers(): number { return this.users().filter(u => u.roleName === 'Customer').length; }
  get kpiManagers(): number { return this.users().filter(u => u.roleName === 'Manager').length; }
  get kpiAdmins(): number { return this.users().filter(u => u.roleName === 'Admin').length; }
  get kpiPending(): number { return this.users().filter(u => u.status === 'Pending').length; }

  displayName(u: AdminUserDto): string {
    return `${u.firstName} ${u.lastName}`;
  }

  createdDisplay(u: AdminUserDto): string {
    return u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-';
  }

  filteredUsers = computed(() => {
    const tab = this.activeTab();
    const q = this.searchTerm().toLowerCase().trim();
    const roleVal = this.roleFilter();
    const statusVal = this.statusFilter();

    return this.users().filter(u => {
      if (tab === 'Customer' && u.roleName !== 'Customer') return false;
      if (tab === 'Manager' && u.roleName !== 'Manager') return false;
      if (tab === 'Pending' && u.status !== 'Pending') return false;

      const name = this.displayName(u);
      if (q && !name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.userCustomId.toLowerCase().includes(q)) return false;
      if (roleVal !== 'all' && u.roleName !== roleVal) return false;
      if (statusVal !== 'all' && u.status !== statusVal) return false;
      return true;
    });
  });

  totalPages = computed(() => {
    const total = this.filteredUsers().length;
    return Math.max(1, Math.ceil(total / this.rowsPerPage()));
  });

  pagedUsers = computed(() => {
    const filtered = this.filteredUsers();
    let page = this.currentPage();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.rowsPerPage()));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    const start = (page - 1) * this.rowsPerPage();
    return filtered.slice(start, start + this.rowsPerPage());
  });

  paginationInfo = computed(() => {
    const total = this.filteredUsers().length;
    if (total === 0) return 'Showing 0 entries';
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.rowsPerPage() + 1;
    const end = Math.min(start + this.rowsPerPage() - 1, total);
    return `Showing ${start} to ${end} of ${total} entries`;
  });

  pageNumbers = computed(() => {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) pages.push(i);
    return pages;
  });

  selectTab(tab: TabKey): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onSearchInput(): void {
    this.currentPage.set(1);
  }

  applyFilters(): void {
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.roleFilter.set('all');
    this.statusFilter.set('all');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  onPageSizeChange(size: string): void {
    this.rowsPerPage.set(parseInt(size, 10));
    this.currentPage.set(1);
  }

  navigateToView(id: number): void {
    this.router.navigate(['/admin/users', id]);
  }

  navigateToAdd(): void {
    this.router.navigate(['/admin/users/add']);
  }

  openDeleteModal(id: number): void {
    this.deleteTargetId.set(id);
    this.deleteReason.set('');
    this.deleteReasonInvalid.set(false);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
  }

  confirmDelete(): void {
    const id = this.deleteTargetId();
    if (!id) return;

    this.usersService.deleteUser(id).subscribe({
      next: () => {
        this.ui.showToast('User deleted successfully.');
        this.showDeleteModal.set(false);
        this.loadUsers();
      },
      error: err => {
        this.ui.showToast(err?.error?.message || 'Failed to delete user.');
        this.showDeleteModal.set(false);
      }
    });
  }

  openBanModal(id: number, mode: 'ban' | 'unban'): void {
    this.banTargetId.set(id);
    this.banMode.set(mode);
    this.banReason.set('');
    this.banReasonInvalid.set(false);
    this.showBanModal.set(true);
  }

  closeBanModal(): void {
    this.showBanModal.set(false);
  }

  confirmBan(): void {
    const reason = this.banReason();
    if (!reason.trim()) {
      this.banReasonInvalid.set(true);
      return;
    }
    this.banReasonInvalid.set(false);

    const id = this.banTargetId();
    if (!id) return;

    const call = this.banMode() === 'ban'
      ? this.usersService.banUser(id, { reason })
      : this.usersService.unbanUser(id, { reason });

    call.subscribe({
      next: () => {
        this.ui.showToast(this.banMode() === 'ban' ? 'User suspended successfully.' : 'User unsuspended successfully.');
        this.showBanModal.set(false);
        this.loadUsers();
      },
      error: err => {
        this.ui.showToast(err?.error?.message || 'Action failed.');
        this.showBanModal.set(false);
      }
    });
  }
}
