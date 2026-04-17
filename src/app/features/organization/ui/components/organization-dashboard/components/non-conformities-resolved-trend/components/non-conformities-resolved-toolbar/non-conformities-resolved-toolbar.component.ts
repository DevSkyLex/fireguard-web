import { ChangeDetectionStrategy, Component, inject, output, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardNonConformitiesResolvedStore } from '@features/organization/state/organization-dashboard';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';

/**
 * Component NonConformitiesResolvedToolbar
 * @class NonConformitiesResolvedToolbar
 *
 * @description
 * Action bar for the non-conformities-resolved trend card.
 * Reads granularity state directly from
 * {@link OrganizationDashboardNonConformitiesResolvedStore} and dispatches updates
 * without intermediate inputs, only propagating the overflow-menu trigger
 * to the parent via {@link menuToggle}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-resolved-toolbar',
  templateUrl: './non-conformities-resolved-toolbar.component.html',
  imports: [
    FormsModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesResolvedToolbar {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store providing granularity state and the
   * {@link OrganizationDashboardNonConformitiesResolvedStore.setGranularity} mutation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardNonConformitiesResolvedStore}
   */
  protected readonly store: OrganizationDashboardNonConformitiesResolvedStore =
    inject<OrganizationDashboardNonConformitiesResolvedStore>(
      OrganizationDashboardNonConformitiesResolvedStore,
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
