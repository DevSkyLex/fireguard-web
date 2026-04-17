import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import type {
  EquipmentStatusOption,
  EquipmentTypeOption,
  FacilityTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  FACILITY_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';

/**
 * Component AssetGrowthFilters
 * @class AssetGrowthFilters
 *
 * @description
 * Footer filter section for the asset-growth trend card.
 * All filter state is read and mutated directly through
 * {@link OrganizationDashboardAssetGrowthStore} — no inputs or outputs
 * are required.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-asset-growth-filters',
  templateUrl: './asset-growth-filters.component.html',
  imports: [FormsModule, DatePickerModule, SelectModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetGrowthFilters {
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
   * @type {OrganizationDashboardAssetGrowthStore}
   */
  protected readonly store: OrganizationDashboardAssetGrowthStore =
    inject<OrganizationDashboardAssetGrowthStore>(OrganizationDashboardAssetGrowthStore);

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
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Available equipment-type filter options (plain labels, no icon/color).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {EquipmentTypeOption[]}
   */
  protected readonly equipmentTypeOptions: EquipmentTypeOption[] = [...EQUIPMENT_TYPE_OPTIONS];

  /**
   * Property equipmentStatusOptions
   * @readonly
   *
   * @description
   * Available equipment-status filter options (icon + color).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {EquipmentStatusOption[]}
   */
  protected readonly equipmentStatusOptions: EquipmentStatusOption[] = [
    ...EQUIPMENT_STATUS_OPTIONS,
  ];

  /**
   * Property facilityTypeOptions
   * @readonly
   *
   * @description
   * Available facility-type filter options (icon only, no color).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FacilityTypeOption[]}
   */
  protected readonly facilityTypeOptions: FacilityTypeOption[] = [...FACILITY_TYPE_OPTIONS];

  /**
   * Property selectedEquipmentStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected equipment status, or `null`.
   * Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<EquipmentStatusOption | null>}
   */
  readonly selectedEquipmentStatusOption: Signal<EquipmentStatusOption | null> =
    computed<EquipmentStatusOption | null>(
      () =>
        EQUIPMENT_STATUS_OPTIONS.find(
          (o) => o.value === this.store.selectedEquipmentStatus(),
        ) ?? null,
    );

  /**
   * Property selectedFacilityTypeOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected facility type, or `null`.
   * Used by the `#selectedItem` template to render the icon.
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
