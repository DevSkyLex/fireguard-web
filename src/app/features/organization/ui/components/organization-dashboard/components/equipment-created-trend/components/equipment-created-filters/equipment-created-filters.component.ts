import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardEquipmentCreatedStore } from '@features/organization/state/organization-dashboard';
import type {
  EquipmentStatusOption,
  EquipmentTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';

/**
 * Component EquipmentCreatedFilters
 * @class EquipmentCreatedFilters
 *
 * @description
 * Footer filter section for the equipment-created trend card.
 * All filter state is read and mutated directly through
 * {@link OrganizationDashboardEquipmentCreatedStore} — no inputs or outputs
 * are required.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-created-filters',
  templateUrl: './equipment-created-filters.component.html',
  imports: [FormsModule, DatePickerModule, SelectModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreatedFilters {
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
   * @type {OrganizationDashboardEquipmentCreatedStore}
   */
  protected readonly store: OrganizationDashboardEquipmentCreatedStore =
    inject<OrganizationDashboardEquipmentCreatedStore>(OrganizationDashboardEquipmentCreatedStore);

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
   * Available equipment type filter options rendered in the first select.
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
   * Available equipment status filter options rendered in the second select.
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
   * Property selectedEquipmentStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected equipment status, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
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

  //#endregion
}
