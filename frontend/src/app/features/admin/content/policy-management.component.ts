import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeasonalPolicyService } from '../../../core/services/seasonal-policy.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { SeasonalPolicy, EffectiveCancellationPolicy } from '../../../core/models/seasonal-policy.model';

/**
 * Admin Policy Management screen — full CRUD against
 * Features/CMS/Controllers/SeasonalPoliciesController.cs (api/admin/policies[/{id}]),
 * following the exact same list + inline add/edit form pattern as promotions.component.ts.
 * Also surfaces the currently-effective policy (seasonal override or base default) and its
 * "last updated" timestamp so admin can directly confirm whether a policy change actually took.
 */
@Component({
  selector: 'app-admin-policy-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './policy-management.component.html',
  styleUrls: ['./policy-management.component.scss']
})
export class PolicyManagementComponent implements OnInit {
  policies: SeasonalPolicy[] = [];
  effective: EffectiveCancellationPolicy | null = null;
  loading = false;

  showForm = false;
  editingId: number | null = null;
  saving = false;

  seasonName = '';
  startDate = '';
  endDate = '';
  isActive = true;
  fullRefundHours = 48;
  partialRefundHours = 24;
  partialRefundPercentage = 0.5;

  constructor(
    private policyService: SeasonalPolicyService,
    private ui: GlobalUiService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadEffective();
  }

  load(): void {
    this.loading = true;
    this.policyService.getAll().subscribe({
      next: (res) => {
        this.policies = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadEffective(): void {
    this.policyService.getEffective().subscribe({
      next: (res) => {
        this.effective = res.data;
      }
    });
  }

  openAdd(): void {
    this.editingId = null;
    this.seasonName = '';
    this.startDate = '';
    this.endDate = '';
    this.isActive = true;
    this.fullRefundHours = 48;
    this.partialRefundHours = 24;
    this.partialRefundPercentage = 0.5;
    this.showForm = true;
  }

  openEdit(policy: SeasonalPolicy): void {
    this.editingId = policy.id;
    this.seasonName = policy.seasonName;
    this.startDate = policy.startDate.substring(0, 10);
    this.endDate = policy.endDate.substring(0, 10);
    this.isActive = policy.isActive;
    this.fullRefundHours = policy.fullRefundHours;
    this.partialRefundHours = policy.partialRefundHours;
    this.partialRefundPercentage = policy.partialRefundPercentage;
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.saving = true;
    const dto = {
      seasonName: this.seasonName,
      startDate: this.startDate,
      endDate: this.endDate,
      isActive: this.isActive,
      fullRefundHours: this.fullRefundHours,
      partialRefundHours: this.partialRefundHours,
      partialRefundPercentage: this.partialRefundPercentage
    };

    const wasEditing = this.editingId;
    const onSuccess = () => {
      this.saving = false;
      this.showForm = false;
      this.editingId = null;
      this.ui.showToast(wasEditing ? 'Seasonal policy updated successfully.' : 'Seasonal policy created successfully.');
      this.load();
      this.loadEffective();
    };
    const onError = () => {
      this.saving = false;
    };

    if (wasEditing) {
      this.policyService.update(wasEditing, dto).subscribe({ next: onSuccess, error: onError });
    } else {
      this.policyService.create(dto).subscribe({ next: onSuccess, error: onError });
    }
  }

  toggleActive(policy: SeasonalPolicy): void {
    const dto = {
      seasonName: policy.seasonName,
      startDate: policy.startDate,
      endDate: policy.endDate,
      isActive: !policy.isActive,
      fullRefundHours: policy.fullRefundHours,
      partialRefundHours: policy.partialRefundHours,
      partialRefundPercentage: policy.partialRefundPercentage
    };
    this.policyService.update(policy.id, dto).subscribe({
      next: () => {
        this.ui.showToast(dto.isActive ? 'Seasonal policy activated.' : 'Seasonal policy deactivated.');
        this.load();
        this.loadEffective();
      }
    });
  }

  deletePolicy(policy: SeasonalPolicy): void {
    if (!confirm(`Delete seasonal policy "${policy.seasonName}"?`)) {
      return;
    }
    this.policyService.delete(policy.id).subscribe({
      next: () => {
        this.ui.showToast('Seasonal policy deleted successfully.');
        this.load();
        this.loadEffective();
      }
    });
  }
}
