import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardInspectionsTrendStore } from '@features/organization/state/organization-dashboard';
import type {
  InspectionResultOption,
  InspectionStatusOption,
  InspectorTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  INSPECTION_RESULT_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  INSPECTOR_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';

/**
 * Component InspectionsFilters
 * @class InspectionsFilters
 *
 * @description
 * Footer filter section for the inspections trend card.
 * All filter state is read and mutated directly through
 * {@link OrganizationDashboardInspectionsTrendStore} — no inputs or outputs
 * are required.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspections-filters',
  templateUrl: './inspections-filters.component.html',
  imports: [FormsModule, DatePickerModule, SelectModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionsFilters {
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
   * @type {OrganizationDashboardInspectionsTrendStore}
   */
  protected readonly store: OrganizationDashboardInspectionsTrendStore =
    inject<OrganizationDashboardInspectionsTrendStore>(OrganizationDashboardInspectionsTrendStore);

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
   * Property inspectionStatusOptions
   * @readonly
   *
   * @description
   * Available inspection status filter options rendered in the first select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InspectionStatusOption[]}
   */
  protected readonly inspectionStatusOptions: InspectionStatusOption[] = [
    ...INSPECTION_STATUS_OPTIONS,
  ];

  /**
   * Property inspectionResultOptions
   * @readonly
   *
   * @description
   * Available inspection result filter options rendered in the second select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InspectionResultOption[]}
   */
  protected readonly inspectionResultOptions: InspectionResultOption[] = [
    ...INSPECTION_RESULT_OPTIONS,
  ];

  /**
   * Property inspectorTypeOptions
   * @readonly
   *
   * @description
   * Available inspector-type filter options rendered in the third select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InspectorTypeOption[]}
   */
  protected readonly inspectorTypeOptions: InspectorTypeOption[] = [...INSPECTOR_TYPE_OPTIONS];

  /**
   * Property selectedInspectionStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected inspection status, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<InspectionStatusOption | null>}
   */
  readonly selectedInspectionStatusOption: Signal<InspectionStatusOption | null> =
    computed<InspectionStatusOption | null>(
      () =>
        INSPECTION_STATUS_OPTIONS.find(
          (o) => o.value === this.store.selectedInspectionStatus(),
        ) ?? null,
    );

  /**
   * Property selectedInspectionResultOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected inspection result, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<InspectionResultOption | null>}
   */
  readonly selectedInspectionResultOption: Signal<InspectionResultOption | null> =
    computed<InspectionResultOption | null>(
      () =>
        INSPECTION_RESULT_OPTIONS.find(
          (o) => o.value === this.store.selectedInspectionResult(),
        ) ?? null,
    );

  //#endregion
}
