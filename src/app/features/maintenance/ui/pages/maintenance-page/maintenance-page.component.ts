import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCcw, lucideWrench } from '@ng-icons/lucide';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';
import { MaintenanceStore } from '../../../state';

/**
 * Component MaintenancePage
 * @class MaintenancePage
 *
 * @description
 * Where `maintenanceGuard` and `maintenanceInterceptor` land while maintenance
 * mode is active — either raised at startup from the environment config, or by
 * a 503 answer at runtime. Both already navigated here before this page
 * existed, which routed a backend outage through the wildcard and showed the
 * member a "page not found".
 *
 * Retrying clears the flag before navigating: the store is the only thing
 * holding the member here, and nothing else lowers it once the API recovers.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-page',
  imports: [NgIcon, PageHeading, HlmButton],
  providers: [provideIcons({ lucideRotateCcw, lucideWrench })],
  templateUrl: './maintenance-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to return to the workspace root once the member asks to retry.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property store
   * @readonly
   *
   * @description
   * The maintenance flag. Retrying has to lower it, or `maintenanceGuard`
   * sends the member straight back here.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MaintenanceStore}
   */
  private readonly store: InstanceType<typeof MaintenanceStore> =
    inject<InstanceType<typeof MaintenanceStore>>(MaintenanceStore);
  //#endregion

  //#region Methods
  /**
   * Method retry
   * @method retry
   *
   * @description
   * Lowers the flag and returns to the workspace root. A still-unavailable API
   * answers 503 again, and the interceptor raises the flag and lands back here
   * — so a premature retry costs one round trip, not a broken state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.deactivate();
    void this.router.navigate(['/']);
  }
  //#endregion
}
