import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { AdminDashboardService } from '../../../core/services/admin-dashboard.service';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { HotelPerformanceDto } from '../../../core/models/admin-dashboard.model';

interface RegistrationRow {
  label: string;
  role: string;
  time: string;
  status: string;
}

/** Overview stats/widgets page. Wired to the real GET api/admindashboard/summary
 *  (4 KPI fields) plus GET api/reports/admin/system-bookings (per-hotel performance table)
 *  and GET api/admin/users (recent registrations table). */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminTopNavComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(AdminDashboardService);
  private readonly usersService = inject(AdminUsersService);

  today = new Date();

  totalActiveUsers = 0;
  totalRevenue = 0;
  activePromotionsCount = 0;
  lastBackupStatus = '';

  registrations: RegistrationRow[] = [];
  hotelPerformances: HotelPerformanceDto[] = [];

  ngOnInit(): void {
    this.dashboardService.getSummary().subscribe({
      next: res => {
        const s = res.data;
        this.totalActiveUsers = s.totalActiveUsers;
        this.totalRevenue = s.totalRevenue;
        this.activePromotionsCount = s.activePromotionsCount;
        this.lastBackupStatus = s.lastBackupStatus;
      }
    });

    this.dashboardService.getSystemBookings().subscribe({
      next: res => {
        this.hotelPerformances = res.data.hotelPerformances || [];
      }
    });

    this.usersService.getAllUsers().subscribe({
      next: res => {
        this.registrations = [...(res.data || [])]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(u => ({
            label: `${u.userCustomId || u.id} - ${u.firstName} ${u.lastName}`,
            role: u.roleName,
            time: new Date(u.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
            status: u.status === 'Active' ? 'Active' : 'Pending'
          }));
      }
    });
  }

  formatCurrency(amount: number): string {
    if (amount >= 100000) {
      return `Rs. ${(amount / 100000).toFixed(1)}L`;
    }
    return `Rs. ${amount.toLocaleString('en-IN')}`;
  }
}
