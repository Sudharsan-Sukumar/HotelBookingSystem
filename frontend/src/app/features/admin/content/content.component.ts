import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { LandingComponent } from '../../landing/landing.component';
import { EditHeroComponent } from './edit-hero.component';
import { EditAboutComponent } from './edit-about.component';
import { EditContactComponent } from './edit-contact.component';
import { EditGeneralPoliciesComponent } from './edit-general-policies.component';

type EditorTab = 'hero' | 'about' | 'contact' | 'policies';

interface QuickLinkCard {
  title: string;
  description: string;
  icon: string;
  link: string;
}

/**
 * Content Management: a permanent split-screen — CMS editors on the left, a live, always-visible
 * read-only preview of the real customer Landing Page on the right. Hero/About/Contact are edited
 * inline here (via the same EditHeroComponent/EditAboutComponent/EditContactComponent used to
 * previously be routed pages) so their in-progress field values can be mirrored into
 * CmsPreviewStore and reflected in the embedded <app-landing> immediately, without navigating
 * away or waiting for Save. Layout/Help Articles/Promotions/Settings remain their own pages,
 * linked below as quick-access cards, since they aren't part of the Hero/About/Contact live-typing
 * requirement and don't need to live inside this split view.
 */
// Composite Pattern — composes independent editor/preview components into one Admin screen.
@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminTopNavComponent, LandingComponent, EditHeroComponent, EditAboutComponent, EditContactComponent, EditGeneralPoliciesComponent],
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss']
})
export class ContentComponent implements AfterViewInit, OnDestroy {
  activeTab: EditorTab = 'hero';

  selectTab(tab: EditorTab): void {
    this.activeTab = tab;
  }

  // Attached once, permanently — the preview is always visible on this screen (no open/close),
  // so there's no need to re-attach on toggle the way a modal version would.
  @ViewChild('previewGuard') previewGuardRef?: ElementRef<HTMLElement>;

  private blockEvent = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  ngAfterViewInit(): void {
    const el = this.previewGuardRef?.nativeElement;
    if (!el) return;
    // Capture phase runs before the target's own click/submit handlers (including Angular's
    // RouterLink and any (click) bindings inside the landing page), so stopping the event here
    // prevents navigation or booking/search/login actions from ever firing — scrolling is
    // untouched since it isn't part of the click/submit event path.
    el.addEventListener('click', this.blockEvent, true);
    el.addEventListener('submit', this.blockEvent, true);
  }

  ngOnDestroy(): void {
    const el = this.previewGuardRef?.nativeElement;
    el?.removeEventListener('click', this.blockEvent, true);
    el?.removeEventListener('submit', this.blockEvent, true);
  }

  readonly quickLinks: QuickLinkCard[] = [
    {
      title: 'Homepage Layout',
      description: 'Control visibility and ordering of the homepage sections.',
      icon: 'bi-grip-vertical',
      link: 'layout'
    },
    {
      title: 'Help Articles',
      description: 'Manage the FAQ / help center articles shown to customers.',
      icon: 'bi-question-circle',
      link: 'help-articles'
    },
    {
      title: 'Promotions & Offers',
      description: 'Manage discount promotions and coupon codes shown to customers.',
      icon: 'bi-tag',
      link: 'promotions'
    },
    {
      title: 'Policy Management',
      description: 'Define seasonal cancellation & refund policies and check when they were last updated.',
      icon: 'bi-shield-check',
      link: 'policies'
    },
    {
      title: 'System Settings',
      description: 'Manage backend key/value configuration settings.',
      icon: 'bi-gear',
      link: '/admin/settings'
    }
  ];
}
