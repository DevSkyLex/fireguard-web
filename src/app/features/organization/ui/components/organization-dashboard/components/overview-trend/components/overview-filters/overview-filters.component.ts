import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleButtonModule } from 'primeng/togglebutton';

/**
 * Component OverviewFilters
 * @class OverviewFilters
 *
 * @description
 * Footer filter section for the overview trend card.
 * Exposes only a date-range picker and a compare toggle — the overview card
 * has no dimension filters. All state is read and mutated directly through
 * {@link OrganizationDashboardOverviewTrendStore}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-overview-filters',
  templateUrl: './overview-filters.component.html',
  imports: [FormsModule, DatePickerModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewFilters {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store used to read and mutate filter selections.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardOverviewTrendStore}
   */
  protected readonly store: OrganizationDashboardOverviewTrendStore =
    inject<OrganizationDashboardOverviewTrendStore>(OrganizationDashboardOverviewTrendStore);

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

  //#endregion
}
