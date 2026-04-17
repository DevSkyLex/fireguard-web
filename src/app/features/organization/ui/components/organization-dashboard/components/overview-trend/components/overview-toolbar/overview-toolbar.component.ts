import { ChangeDetectionStrategy, Component, inject, output, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';

/**
 * Component OverviewToolbar
 * @class OverviewToolbar
 *
 * @description
 * Action bar for the overview trend card.
 * Reads granularity state directly from
 * {@link OrganizationDashboardOverviewTrendStore} and dispatches updates
 * without intermediate inputs, only propagating the overflow-menu trigger
 * to the parent via {@link menuToggle}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-overview-toolbar',
  templateUrl: './overview-toolbar.component.html',
  imports: [
    FormsModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewToolbar {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store providing granularity state and the
   * {@link OrganizationDashboardOverviewTrendStore.setGranularity} mutation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardOverviewTrendStore}
   */
  protected readonly store: OrganizationDashboardOverviewTrendStore =
    inject<OrganizationDashboardOverviewTrendStore>(OrganizationDashboardOverviewTrendStore);

  //#endregion

  //#region Events

  /**
   * Event menuToggle
   *
   * @description
   * Emitted when the user clicks the overflow-menu button.
   * The parent card is responsible for toggling its popup menu instance.
   *
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<MouseEvent>}
   */
  readonly menuToggle: OutputEmitterRef<MouseEvent> = output<MouseEvent>();

  //#endregion
}
