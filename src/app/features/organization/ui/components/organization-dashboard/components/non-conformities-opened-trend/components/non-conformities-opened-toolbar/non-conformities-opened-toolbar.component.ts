import { ChangeDetectionStrategy, Component, inject, output, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';

/**
 * Component NonConformitiesOpenedToolbar
 * @class NonConformitiesOpenedToolbar
 *
 * @description
 * Action bar for the non-conformities-opened trend card.
 * Reads granularity state directly from
 * {@link OrganizationDashboardNonConformitiesOpenedStore} and dispatches updates
 * without intermediate inputs, only propagating the overflow-menu trigger
 * to the parent via {@link menuToggle}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-opened-toolbar',
  templateUrl: './non-conformities-opened-toolbar.component.html',
  imports: [
    FormsModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesOpenedToolbar {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store providing granularity state and the
   * {@link OrganizationDashboardNonConformitiesOpenedStore.setGranularity} mutation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardNonConformitiesOpenedStore}
   */
  protected readonly store: OrganizationDashboardNonConformitiesOpenedStore =
    inject<OrganizationDashboardNonConformitiesOpenedStore>(
      OrganizationDashboardNonConformitiesOpenedStore,
    );

  //#endregion

  //#region Events

  /**
   * Event menuToggle
   *
   * @description
   * Emitted when the user clicks the overflow-menu button.
   * The parent card is responsible for toggling its popup menu instance.
   *
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<MouseEvent>}
   */
  readonly menuToggle: OutputEmitterRef<MouseEvent> = output<MouseEvent>();

  //#endregion
}
