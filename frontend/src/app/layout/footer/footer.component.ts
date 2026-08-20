import { AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { CmsPreviewStore } from '../../core/services/cms-preview-store.service';
import { GeneralPolicyService } from '../../core/services/general-policy.service';
import { GeneralPolicy, GeneralPolicyType } from '../../core/models/general-policy.model';

declare const L: any;

interface BranchDetail {
  name: string; rating: string; address: string; phone: string; rooms: string; img: string; lat: number; lng: number;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html'
})
export class FooterComponent implements OnInit, AfterViewInit, OnDestroy {
  // Set only when embedded inside the Admin Content Management live preview — see LandingComponent.
  @Input() previewMode = false;

  // Defaults match the original hardcoded copy — used as a fallback if the CMS fetch fails or no
  // Contact record has been saved yet.
  contactEmail = 'support@elegantenclave.com';
  contactPhone = '+91 98765 43210';

  // Permanent hotel policies (Privacy/Terms/Modification/Cancellation & Refund) shown in the four
  // footer modals below — fetched from GeneralPoliciesController instead of the hardcoded copy
  // this footer used to carry directly. Keyed by policyType so the template can look each one up
  // by name; falls back to empty strings (modal simply shows nothing) only if the fetch fails,
  // which the backend's own lazy-seed defaults make very unlikely in practice.
  generalPolicies: Record<GeneralPolicyType, GeneralPolicy | null> = {
    Privacy: null,
    Terms: null,
    Modification: null,
    CancellationRefund: null
  };

  private previewSub?: Subscription;
  private generalPolicyPreviewSub?: Subscription;

  mapInitialized = false;
  largeMap: any = null;
  largeMarkers: Record<string, any> = {};
  selectedBranchDetail: BranchDetail | null = null;

  callState: 'idle' | 'progress' | 'result' = 'idle';
  callDuration = 0;
  private callTimer: any = null;

  constructor(
    private contentService: ContentService,
    private generalPolicyService: GeneralPolicyService,
    private previewStore: CmsPreviewStore,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.contentService.getContact().subscribe({
      next: (res) => {
        const contact = res.data;
        if (!contact) return;
        if (contact.phone) this.contactPhone = contact.phone;
        if (contact.email) this.contactEmail = contact.email;
        this.cdr.markForCheck();
      },
      error: () => {
        // Keep the hardcoded defaults above.
      }
    });

    this.generalPolicyService.getAll().subscribe({
      next: (res) => {
        for (const policy of res.data) {
          this.generalPolicies[policy.policyType] = policy;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        // Modals simply render empty if this fails — no hardcoded fallback text to fall back to
        // anymore now that this is the single source of truth for these four policies.
      }
    });

    if (this.previewMode) {
      this.previewSub = this.previewStore.contact$.subscribe(contact => {
        if (!contact) return;
        this.contactPhone = contact.phone || this.contactPhone;
        this.contactEmail = contact.email || this.contactEmail;
        this.cdr.markForCheck();
      });

      this.generalPolicyPreviewSub = this.previewStore.generalPolicy$.subscribe(preview => {
        if (!preview) return;
        const existing = this.generalPolicies[preview.policyType as GeneralPolicyType];
        this.generalPolicies[preview.policyType as GeneralPolicyType] = {
          policyType: preview.policyType as GeneralPolicyType,
          title: preview.title,
          content: preview.content,
          updatedAt: existing?.updatedAt || ''
        };
        this.cdr.markForCheck();
      });
    }
  }

  ngOnDestroy(): void {
    this.previewSub?.unsubscribe();
    this.generalPolicyPreviewSub?.unsubscribe();
  }

  branchLocations = [
    { name: 'Elegant Enclave - Chennai', city: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Elegant Enclave - Coimbatore', city: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
    { name: 'Elegant Enclave - Salem', city: 'Salem', lat: 11.6643, lng: 78.1460 }
  ];

  branchDetails: Record<string, BranchDetail> = {
    Salem: { name: 'Elegant Enclave Salem', rating: '4.6', address: '14, Saradha College Road, Fairlands, Salem - 636016', phone: '+91-427-2234567', rooms: 'Executive Studio Room, Deluxe Suite, Presidential Suite', img: '/assets/images/hotel_salem.png', lat: 11.6643, lng: 78.1460 },
    Coimbatore: { name: 'Elegant Enclave Coimbatore', rating: '4.7', address: '12, Avinashi Road, Coimbatore - 641018', phone: '+91-422-2234567', rooms: 'Executive Studio Room, Premium Suite, Presidential Suite', img: '/assets/images/hotel_cbe.png', lat: 11.0168, lng: 76.9558 },
    Chennai: { name: 'Elegant Enclave Chennai', rating: '4.8', address: '45, Mount Road, Chennai - 600002', phone: '+91-44-2234567', rooms: 'Executive Studio Room, Grand Suite, Presidential Suite', img: '/assets/images/hotel_chennai.png', lat: 13.0827, lng: 80.2707 }
  };

  ngAfterViewInit(): void {}

  onMapPlaceholderClick(): void {
    if (this.mapInitialized) return;
    this.mapInitialized = true;
    setTimeout(() => this.initFooterMap(), 100);
  }

  private initFooterMap(): void {
    const map = L.map('footerMap', { center: [11.9, 78.5], zoom: 6, zoomControl: true, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd', maxZoom: 20
    }).addTo(map);

    const goldIcon = this.goldIcon(24);
    this.branchLocations.forEach(loc => {
      const marker = L.marker([loc.lat, loc.lng], { icon: goldIcon }).addTo(map);
      marker.bindPopup(`<div style="padding:2px;color:#1A0A2E;"><h6 style="margin:0;font-size:0.85rem;font-weight:bold;">${loc.name}</h6><p style="margin:4px 0 0 0;font-size:0.75rem;">Click to explore property</p></div>`);
      marker.on('click', () => this.openLargeMapModal(loc.city));
    });
  }

  private goldIcon(size: number) {
    return L.divIcon({
      className: 'custom-map-marker-div',
      html: `<div style="background-color:#1A0A2E;border:2px solid #D4AF37;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><i class="bi bi-award-fill" style="color:#D4AF37;font-size:${size / 2}px;line-height:1;"></i></div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2]
    });
  }

  openLargeMapModal(city?: string): void {
    const modalEl = document.getElementById('largeMapModal');
    if (!modalEl || !(window as any).bootstrap) return;
    const bsModal = new (window as any).bootstrap.Modal(modalEl);
    bsModal.show();

    setTimeout(() => {
      if (!this.largeMap) {
        this.largeMap = L.map('largeMapContainer', { center: [11.9, 78.5], zoom: 7, zoomControl: true });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(this.largeMap);

        const goldIcon = this.goldIcon(32);
        Object.keys(this.branchDetails).forEach(c => {
          const d = this.branchDetails[c];
          const marker = L.marker([d.lat, d.lng], { icon: goldIcon }).addTo(this.largeMap);
          this.largeMarkers[c] = marker;
          marker.on('click', () => this.selectBranchInModal(c));
        });
      } else {
        this.largeMap.invalidateSize();
      }

      if (city && this.branchDetails[city]) {
        this.selectBranchInModal(city);
      } else {
        this.largeMap.setView([11.9, 78.5], 7);
        this.selectedBranchDetail = null;
      }
    }, 300);
  }

  selectBranchInModal(city: string): void {
    const detail = this.branchDetails[city];
    if (!detail || !this.largeMap) return;
    this.largeMap.setView([detail.lat, detail.lng], 12);
    const marker = this.largeMarkers[city];
    if (marker) {
      marker.bindPopup(`<div style="color:#1A0A2E;text-align:left;width:200px;"><h6 style="margin:0 0 4px 0;font-weight:bold;">${detail.name}</h6><p style="margin:0 0 6px 0;font-size:0.75rem;">Rating: ${detail.rating}</p><p style="margin:0;font-size:0.75rem;">${detail.address}</p></div>`).openPopup();
    }
    this.selectedBranchDetail = detail;
  }

  openEmailClient(): void {
    const mailto = `mailto:reception@elegantenclave.com?subject=${encodeURIComponent('Reception Assistance Request')}&body=${encodeURIComponent('Hello Reception Team,\n\nI would like to contact the reception regarding...\n\nThank you.')}`;
    window.open(mailto, '_self');
  }

  startReceptionCall(): void {
    const mainModalEl = document.getElementById('receptionContactModal');
    const bootstrap = (window as any).bootstrap;
    if (mainModalEl && bootstrap) {
      const inst = bootstrap.Modal.getInstance(mainModalEl);
      if (inst) inst.hide();
    }

    this.callState = 'progress';
    this.callDuration = 0;
    this.callTimer = setInterval(() => this.callDuration++, 1000);

    const callModalEl = document.getElementById('receptionCallModal');
    if (callModalEl && bootstrap) {
      new bootstrap.Modal(callModalEl).show();
    }

    setTimeout(() => {
      if (this.callState !== 'progress') return;
      const message = 'Sorry for the inconvenience. The reception is not available right now. Please try again after some time.';
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(message);
        utter.lang = 'en-US';
        utter.onend = () => this.showCallUnavailable();
        utter.onerror = () => this.showCallUnavailable();
        window.speechSynthesis.speak(utter);
      } else {
        this.showCallUnavailable();
      }
    }, 4000);
  }

  private showCallUnavailable(): void {
    clearInterval(this.callTimer);
    this.callState = 'result';
  }

  cancelCall(): void {
    clearInterval(this.callTimer);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.callState = 'idle';
    const callModalEl = document.getElementById('receptionCallModal');
    const bootstrap = (window as any).bootstrap;
    if (callModalEl && bootstrap) {
      const inst = bootstrap.Modal.getInstance(callModalEl);
      if (inst) inst.hide();
    }
  }

  get callDurationLabel(): string {
    const mins = String(Math.floor(this.callDuration / 60)).padStart(2, '0');
    const secs = String(this.callDuration % 60).padStart(2, '0');
    return `Duration: ${mins}:${secs}`;
  }
}
