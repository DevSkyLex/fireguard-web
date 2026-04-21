import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { TrendBaseFiltersForm } from '@features/organization/ui/components/organization-dashboard/forms';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';

/**
 * Component OverviewFilters
 * @class OverviewFilters
 *
 * @description
 * Drawer filter form for the overview trend card.
 * Exposes only the shared date-range picker and compare toggle because the
 * overview card has no dimension filters. All state is read and mutated
 * through the draft filter API of {@link OrganizationDashboardOverviewTrendStore}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-overview-filters',
  templateUrl: './overview-filters.component.html',
  imports: [TrendBaseFiltersForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewFilters {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
  * Component-scoped store used to read and mutate draft filter selections.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardOverviewTrendStore}
   */
  protected readonly store: OrganizationDashboardOverviewTrendStore =
    inject<OrganizationDashboardOverviewTrendStore>(OrganizationDashboardOverviewTrendStore);

  /**
   * Property draftDateRange
   * @readonly
   *
   * @description
   * Typed draft date-range signal exposed for template consumption.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<Date[] | null>}
   */
  protected readonly draftDateRange: Signal<Date[] | null> = computed<Date[] | null>(
    () => this.store['draftDateRange']() as Date[] | null,
  );

  /**
   * Property draftCompareEnabled
   * @readonly
   *
   * @description
   * Typed draft compare flag exposed for template consumption.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly draftCompareEnabled: Signal<boolean> = computed<boolean>(
    () => this.store['draftCompareEnabled']() as boolean,
  );

  //#endregion

  //#region Methods

  /**
   * Method onDateRangeChange
   *
   * @description
   * Updates the draft date range.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {Date[] | null} dateRange - Next draft date range.
   * @returns {void}
   */
  protected onDateRangeChange(dateRange: Date[] | null): void {
    this.store.setDraftDateRange(dateRange);
  }

  /**
   * Method onCompareEnabledChange
   *
   * @description
   * Updates the draft compare mode.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {boolean} compareEnabled - Next draft compare flag.
   * @returns {void}
   */
  protected onCompareEnabledChange(compareEnabled: boolean): void {
    this.store.setDraftCompareEnabled(compareEnabled);
  }

  //#endregion
}
