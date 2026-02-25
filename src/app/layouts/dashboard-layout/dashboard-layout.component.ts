import { Component, ChangeDetectionStrategy, inject, effect, untracked } from "@angular/core";
import { ActivatedRoute, Data, RouterOutlet } from "@angular/router";
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import type { OrganizationOutput } from '@core/models/organization';
import { DashboardLayoutHeader, DashboardLayoutSidebar, DashboardLayoutContent } from "@layouts/dashboard-layout/partials";
import { DrawerModule } from 'primeng/drawer';
import { Ripple } from "primeng/ripple";
import { DashboardSidebarResizeHandleDirective } from './directives';
import { DashboardBreadcrumbService, DashboardSidebarNavigationService, DashboardSidebarService } from './services';
import { UserStore } from '@core/stores/user';
import { NotificationStore } from '@core/stores/notification';
import { OrganizationStore } from '@core/stores/organization';

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
  providers: [DashboardSidebarService, DashboardSidebarNavigationService, DashboardBreadcrumbService],
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

  private readonly route: ActivatedRoute =
    inject(ActivatedRoute);

  private readonly organizationStore: OrganizationStore =
    inject(OrganizationStore);

  private readonly resolvedOrganization = toSignal<OrganizationOutput | undefined>(
    this.route.data.pipe(map((data: Data): OrganizationOutput => data['organization'])),
  );
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

    /** Push the resolved organization into the store so it is available globally. */
    effect(() => {
      const organization: OrganizationOutput | undefined = this.resolvedOrganization();
      if (organization) {
        untracked(() => {
          this.organizationStore.setOrganization(organization);
        });
      }
    });
  }
}
