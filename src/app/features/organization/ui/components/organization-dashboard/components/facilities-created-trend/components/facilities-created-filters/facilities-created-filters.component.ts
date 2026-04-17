import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardFacilitiesCreatedStore } from '@features/organization/state/organization-dashboard';
import type { FacilityTypeOption } from '@features/organization/ui/components/organization-dashboard/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/ui/components/organization-dashboard/options';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';

/**
 * Component FacilitiesCreatedFilters
 * @class FacilitiesCreatedFilters
 *
 * @description
 * Footer filter section for the facilities-created trend card.
 * All filter state is read and mutated directly through
 * {@link OrganizationDashboardFacilitiesCreatedStore} — no inputs or outputs
 * are required.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-created-filters',
  templateUrl: './facilities-created-filters.component.html',
  imports: [FormsModule, DatePickerModule, SelectModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitiesCreatedFilters {
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
   * @type {OrganizationDashboardFacilitiesCreatedStore}
   */
  protected readonly store: OrganizationDashboardFacilitiesCreatedStore =
    inject<OrganizationDashboardFacilitiesCreatedStore>(OrganizationDashboardFacilitiesCreatedStore);

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
   * Property facilityTypeOptions
   * @readonly
   *
   * @description
   * Available facility type filter options rendered in the select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FacilityTypeOption[]}
   */
  protected readonly facilityTypeOptions: FacilityTypeOption[] = [...FACILITY_TYPE_OPTIONS];

  /**
   * Property selectedFacilityTypeOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected facility type, or `null` when
   * cleared. Used by the `#selectedItem` template to render the icon.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<FacilityTypeOption | null>}
   */
  readonly selectedFacilityTypeOption: Signal<FacilityTypeOption | null> =
    computed<FacilityTypeOption | null>(
      () =>
        FACILITY_TYPE_OPTIONS.find((o) => o.value === this.store.selectedFacilityType()) ?? null,
    );

  //#endregion
}
