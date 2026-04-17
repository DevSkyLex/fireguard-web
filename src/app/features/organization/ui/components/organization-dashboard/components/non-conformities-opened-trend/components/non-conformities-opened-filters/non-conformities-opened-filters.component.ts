import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import type {
  NonConformityStatusOption,
  NonConformitySeverityOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  NON_CONFORMITY_SEVERITY_OPTIONS,
  NON_CONFORMITY_STATUS_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';

/**
 * Component NonConformitiesOpenedFilters
 * @class NonConformitiesOpenedFilters
 *
 * @description
 * Footer filter section for the non-conformities-opened trend card.
 * All filter state is read and mutated directly through
 * {@link OrganizationDashboardNonConformitiesOpenedStore} — no inputs or outputs
 * are required.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-opened-filters',
  templateUrl: './non-conformities-opened-filters.component.html',
  imports: [FormsModule, DatePickerModule, SelectModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesOpenedFilters {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store used to read and mutate all filter selections.
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

  /**
   * Property today
   * @readonly
   *
   * @description
   * Upper bound for the date-range picker. Prevents selecting future dates.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Date}
   */
  protected readonly today: Date = new Date();

  /**
   * Property nonConformityStatusOptions
   * @readonly
   *
   * @description
   * Available non-conformity status filter options rendered in the first select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {NonConformityStatusOption[]}
   */
  protected readonly nonConformityStatusOptions: NonConformityStatusOption[] = [
    ...NON_CONFORMITY_STATUS_OPTIONS,
  ];

  /**
   * Property nonConformitySeverityOptions
   * @readonly
   *
   * @description
   * Available non-conformity severity filter options rendered in the second select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {NonConformitySeverityOption[]}
   */
  protected readonly nonConformitySeverityOptions: NonConformitySeverityOption[] = [
    ...NON_CONFORMITY_SEVERITY_OPTIONS,
  ];

  /**
   * Property selectedNonConformityStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected non-conformity status, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<NonConformityStatusOption | null>}
   */
  readonly selectedNonConformityStatusOption: Signal<NonConformityStatusOption | null> =
    computed<NonConformityStatusOption | null>(
      () =>
        NON_CONFORMITY_STATUS_OPTIONS.find(
          (o) => o.value === this.store.selectedNonConformityStatus(),
        ) ?? null,
    );

  /**
   * Property selectedSeverityOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected severity, or `null` when
   * cleared. Used by the `#selectedItem` template to render the colour swatch.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<NonConformitySeverityOption | null>}
   */
  readonly selectedSeverityOption: Signal<NonConformitySeverityOption | null> =
    computed<NonConformitySeverityOption | null>(
      () =>
        NON_CONFORMITY_SEVERITY_OPTIONS.find(
          (o) => o.value === this.store.selectedNonConformitySeverity(),
        ) ?? null,
    );

  //#endregion
}
