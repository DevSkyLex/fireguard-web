import { Component, ChangeDetectionStrategy, inject, effect, untracked } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { DashboardLayoutHeader, DashboardLayoutSidebar, DashboardLayoutContent } from "@layouts/dashboard-layout/partials";
import { DrawerModule } from 'primeng/drawer';
import { Ripple } from "primeng/ripple";
import { DashboardSidebarResizeHandleDirective } from './directives';
import { DashboardSidebarNavigationService, DashboardSidebarService } from './services';
import { BreadcrumbService } from '@core/services/breadcrumb';
import { UserStore, NotificationStore } from '@features/account';

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

  protected readonly userStore: UserStore =
    inject(UserStore);

  protected readonly notificationStore: NotificationStore =
    inject(NotificationStore);
  //#endregion

  constructor() {
    effect(() => {
      if (this.userStore.profile()) {
        untracked(() => {
          this.notificationStore.load();
          this.notificationStore.connectMercure();
        });
      }
    });
  }
}
