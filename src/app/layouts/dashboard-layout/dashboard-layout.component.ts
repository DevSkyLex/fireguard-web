import { Component, ChangeDetectionStrategy, computed, inject, effect, untracked, type Signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { Ripple } from 'primeng/ripple';
import { BreadcrumbService } from '@core/services/breadcrumb';
import {
  DASHBOARD_CONTEXT_PANEL_CONTRIBUTION,
  type DashboardContextPanelContribution,
} from '@core/ports/dashboard-context-panel';
import {
  NOTIFICATION_CENTER_PORT,
  USER_IDENTITY_PORT,
  type NotificationCenterPort,
  type UserIdentityPort,
} from '@features/account/ports';
import {
  DashboardLayoutHeader,
  DashboardLayoutSidebar,
  DashboardLayoutContent,
  DashboardLayoutContextPanel,
} from '@layouts/dashboard-layout/components';
import { DashboardSidebarResizeHandleDirective } from './directives';
import { DashboardSidebarNavigationService, DashboardSidebarService } from './services';

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * Layout component for dashboard pages like
 * home, profile, settings, etc.
 *
 * Provides {@link DashboardSidebarService} and
 * {@link DashboardSidebarNavigationService} at the component level
 * so child components can inject them directly.
 *
 * Responsive behavior:
 * - Desktop (lg+): resizable sidebar panel on the left (drag handle)
 * - Mobile (<lg): sidebar hidden, accessible via Drawer overlay
 *
 * @version 1.5.0
 *
 * @example
 * ```html
 * <app-dashboard-layout/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout',
  imports: [
    RouterOutlet,
    DashboardLayoutHeader,
    DashboardLayoutSidebar,
    DashboardLayoutContextPanel,
    DashboardLayoutContent,
    DrawerModule,
    Ripple,
    DashboardSidebarResizeHandleDirective,
  ],
  providers: [DashboardSidebarService, DashboardSidebarNavigationService, BreadcrumbService],
  templateUrl: './dashboard-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  //#region Properties
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  private readonly contributions: DashboardContextPanelContribution[] =
    inject<DashboardContextPanelContribution[]>(
      DASHBOARD_CONTEXT_PANEL_CONTRIBUTION,
      { optional: true },
    ) ?? [];

  protected readonly hasActiveContextPanel: Signal<boolean> = computed(
    (): boolean => this.contributions.some((c: DashboardContextPanelContribution) => c.isActive()),
  );

  protected readonly userIdentityPort: UserIdentityPort =
    inject<UserIdentityPort>(USER_IDENTITY_PORT);

  protected readonly notificationCenterPort: NotificationCenterPort =
    inject<NotificationCenterPort>(NOTIFICATION_CENTER_PORT);
  //#endregion

  constructor() {
    effect(() => {
      if (this.userIdentityPort.profile()) {
        untracked(() => {
          void this.notificationCenterPort.initialize();
          this.notificationCenterPort.connectMercure();
        });
      }
    });
  }
}
