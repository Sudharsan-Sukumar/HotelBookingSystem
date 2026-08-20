import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HotelStateService } from '../../../core/services/hotel-state.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';

interface LayoutSection {
  key: string;
  label: string;
  icon: string;
  enabled: boolean;
}

/** Master list of homepage sections that content.layout can reference. */
const ALL_SECTIONS: Omit<LayoutSection, 'enabled'>[] = [
  { key: 'hero', label: 'Hero Banner', icon: 'bi-grip-vertical' },
  { key: 'promotions', label: 'Promotions & Offers', icon: 'bi-grip-vertical' },
  { key: 'featured', label: 'Featured Rooms', icon: 'bi-grip-vertical' },
  { key: 'about', label: 'About Us', icon: 'bi-grip-vertical' },
  { key: 'footer', label: 'Contact & Footer', icon: 'bi-grip-vertical' }
];

/**
 * Direct port of edit_layout.html.
 * The original used native HTML5 drag-and-drop on hard-coded, always-visible
 * list items (no persisted state at all — btnSaveLayout only shows a toast).
 * We wire it to the real `content.layout` array (an ordered array of section
 * keys — see HotelStateService seed) so ordering and enable/disable actually
 * persist: up/down buttons replace native drag-and-drop, which does not
 * translate cleanly to a ported, keyboard-accessible Angular component.
 */
@Component({
  selector: 'app-admin-edit-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminTopNavComponent],
  templateUrl: './edit-layout.component.html',
  styleUrls: ['./edit-layout.component.scss']
})
export class EditLayoutComponent implements OnInit {
  sections: LayoutSection[] = [];

  constructor(
    private hotelState: HotelStateService,
    private ui: GlobalUiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const layout: string[] = this.hotelState.content?.layout || ALL_SECTIONS.map(s => s.key);

    // Preserve saved ordering, then append any sections missing from it.
    const ordered = layout
      .map(key => ALL_SECTIONS.find(s => s.key === key))
      .filter((s): s is Omit<LayoutSection, 'enabled'> => !!s);
    const missing = ALL_SECTIONS.filter(s => !ordered.some(o => o.key === s.key));

    this.sections = [...ordered, ...missing].map(s => ({ ...s, enabled: true }));
  }

  moveUp(index: number): void {
    if (index === 0) return;
    [this.sections[index - 1], this.sections[index]] = [this.sections[index], this.sections[index - 1]];
  }

  moveDown(index: number): void {
    if (index === this.sections.length - 1) return;
    [this.sections[index + 1], this.sections[index]] = [this.sections[index], this.sections[index + 1]];
  }

  toggleEnabled(section: LayoutSection): void {
    section.enabled = !section.enabled;
  }

  saveLayout(): void {
    const content = this.hotelState.content || {};
    content.layout = this.sections.filter(s => s.enabled).map(s => s.key);
    this.hotelState.content = content;

    this.ui.showToast('Content Layout Updated Successfully.', () => {
      this.router.navigate(['/admin/content']);
    });
  }
}
