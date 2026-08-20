import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { AdminUserDto } from '../../../core/models/admin-user.model';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';

/** Read-only user profile detail, wired to GET api/admin/users/{id}. */
@Component({
  selector: 'app-view-user',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminTopNavComponent],
  templateUrl: './view-user.component.html',
  styleUrls: ['./view-user.component.scss']
})
export class ViewUserComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(AdminUsersService);

  user: AdminUserDto | null = null;
  notFound = false;
  loading = true;

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!idParam || isNaN(id)) {
      this.notFound = true;
      this.loading = false;
      return;
    }
    this.usersService.getUser(id).subscribe({
      next: res => {
        this.user = res.data;
        this.loading = false;
      },
      error: () => {
        this.notFound = true;
        this.loading = false;
      }
    });
  }

  get displayName(): string {
    if (!this.user) return '';
    return `${this.user.firstName} ${this.user.lastName}`;
  }

  back(): void {
    this.router.navigate(['/admin/users']);
  }
}
