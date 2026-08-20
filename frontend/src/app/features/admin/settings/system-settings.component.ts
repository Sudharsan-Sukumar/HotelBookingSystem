import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SystemSettingsService } from '../../../core/services/system-settings.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { SystemSetting } from '../../../core/models/cms.model';

/**
 * New System Settings screen (previously missing) — key/value editor against
 * Features/CMS/Controllers/SystemSettingsController.cs (api/systemsettings).
 * GET all lists existing keys, PUT/{key} edits a value inline, POST creates
 * a brand-new key/value pair.
 */
@Component({
  selector: 'app-admin-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit {
  settings: SystemSetting[] = [];
  loading = false;

  editingKey: string | null = null;
  editValue = '';
  savingKey: string | null = null;

  showAddForm = false;
  newKey = '';
  newValue = '';
  saving = false;

  constructor(
    private settingsService: SystemSettingsService,
    private ui: GlobalUiService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.settingsService.getAll().subscribe({
      next: (res) => {
        this.settings = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  startEdit(setting: SystemSetting): void {
    this.editingKey = setting.key;
    this.editValue = setting.value;
  }

  cancelEdit(): void {
    this.editingKey = null;
    this.editValue = '';
  }

  saveEdit(setting: SystemSetting): void {
    this.savingKey = setting.key;
    this.settingsService.update(setting.key, { key: setting.key, value: this.editValue }).subscribe({
      next: () => {
        setting.value = this.editValue;
        this.savingKey = null;
        this.editingKey = null;
        this.ui.showToast('Setting updated successfully.');
      },
      error: () => {
        this.savingKey = null;
      }
    });
  }

  openAdd(): void {
    this.newKey = '';
    this.newValue = '';
    this.showAddForm = true;
  }

  cancelAdd(): void {
    this.showAddForm = false;
  }

  onAddSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.saving = true;
    this.settingsService.create({ key: this.newKey, value: this.newValue }).subscribe({
      next: () => {
        this.saving = false;
        this.showAddForm = false;
        this.ui.showToast('Setting created successfully.');
        this.load();
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
