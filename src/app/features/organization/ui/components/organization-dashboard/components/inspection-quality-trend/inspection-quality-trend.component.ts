import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { PrimeIcons } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import {
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  countDefinedDashboardFilters,
  getDashboardBaseActiveFilterCount,
  InspectionQualityTrendStore,
} from '@features/organization/state/organization-dashboard';
import type { DashboardSummaryMetric } from '@features/organization/ui/components/organization-dashboard/models';
import {
  DECIMAL_FMT,
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { TrendCard } from '@shared/components';
import { TrendFilterDrawer } from '../trend-filter-drawer/trend-filter-drawer.component';
import {
  InspectionQualityChart,
  InspectionQualityFilters,
  InspectionQualityToolbar,
} from './components';

/**
 * Component InspectionQualityTrend
 * @class InspectionQualityTrend
 *
 * @description
 * Dashboard card displaying a bar chart of inspection quality versus
 * non-conformity pressure. All state, filtering and API logic is delegated to
 * {@link InspectionQualityTrendStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-quality-trend',
  templateUrl: './inspection-quality-trend.component.html',
  imports: [
    TrendCard,
    MenuModule,
    TrendFilterDrawer,
    InspectionQualityToolbar,
    InspectionQualityChart,
    InspectionQualityFilters,
  ],
  providers: [InspectionQualityTrendStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionQualityTrend {
  //#region Properties

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root store used to read the active organization identifier
   * and build navigation links.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property dashboardStore
   * @readonly
   *
   * @description
   * Local store that owns all state, chart data and API calls for this card.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InspectionQualityTrendStore}
   */
  private readonly dashboardStore: InspectionQualityTrendStore =
    inject<InspectionQualityTrendStore>(InspectionQualityTrendStore);

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Drives the `[loading]` input of {@link TrendCard}. Delegates to the
   * store's query loading flag so that the store itself can remain private.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed<boolean>(() =>
    this.dashboardStore.isQueryLoading(),
  );

  /**
   * Property isFilterDrawerVisible
   * @readonly
   *
   * @description
   * Controlled visibility state for the trend filter drawer.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isFilterDrawerVisible: Signal<boolean> = computed<boolean>(() =>
    this.dashboardStore.isFilterDrawerVisible(),
  );

  /**
   * Property activeFilterCount
   * @readonly
   *
   * @description
   * Number of currently applied filters reflected on the Filters button.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<number>}
   */
  protected readonly activeFilterCount: Signal<number> = computed<number>(
    () =>
      getDashboardBaseActiveFilterCount(
        this.dashboardStore.selectedDateRange(),
        this.dashboardStore.compareEnabled(),
      ) +
      countDefinedDashboardFilters([
        this.dashboardStore.selectedInspectionStatus(),
        this.dashboardStore.selectedInspectionResult(),
        this.dashboardStore.selectedInspectorType(),
        this.dashboardStore.selectedNonConformitySeverity(),
      ]),
  );

  /**
   * Property summaryMetrics
   * @readonly
   *
   * @description
   * Four KPI tiles fed to {@link TrendCard}: total inspections, total opened NCs,
   * NC rate percentage, and the rate shift (last minus first bucket in the NC rate
   * series). Comparison deltas are included only when compare mode is enabled.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly DashboardSummaryMetric[]>}
   */
  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => {
    const data = this.dashboardStore.queryData();
    if (!data) return [];
    const compareEnabled = this.dashboardStore.compareEnabled();
    const inspectionTotal = sumDashboardTrendValues(
      (data?.inspections?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const ncOpenedTotal = sumDashboardTrendValues(
      (data?.ncOpened?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const previousInspectionTotal = sumDashboardTrendValues(
      (data?.inspections?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const previousNcOpenedTotal = sumDashboardTrendValues(
      (data?.ncOpened?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const ncRate = inspectionTotal > 0 ? (ncOpenedTotal / inspectionTotal) * 100 : 0;
    const previousNcRate =
      previousInspectionTotal > 0 ? (previousNcOpenedTotal / previousInspectionTotal) * 100 : 0;
    const currentRates = this.dashboardStore.rateSeriesData();
    const rateShift =
      currentRates.length >= 2 ? currentRates[currentRates.length - 1] - currentRates[0] : 0;
    return [
      {
        label: $localize`:@@dash.metric.inspections:Inspections`,
        value: WHOLE_NUMBER_FMT.format(inspectionTotal),
        icon: 'pi pi-clipboard',
        comparison: buildDashboardComparison(
          inspectionTotal,
          previousInspectionTotal,
          compareEnabled,
        ),
      },
      {
        label: $localize`:@@dash.metric.openedNc:Opened NC`,
        value: WHOLE_NUMBER_FMT.format(ncOpenedTotal),
        icon: 'pi pi-exclamation-triangle',
        comparison: buildDashboardComparison(ncOpenedTotal, previousNcOpenedTotal, compareEnabled),
      },
      {
        label: $localize`:@@dash.metric.ncRate:NC Rate`,
        value: `${DECIMAL_FMT.format(ncRate)}%`,
        icon: 'pi pi-percentage',
        comparison: buildDashboardComparison(ncRate, previousNcRate, compareEnabled),
      },
      {
        label: $localize`:@@dash.metric.rateShift:Rate Shift`,
        value: `${rateShift >= 0 ? '+' : ''}${DECIMAL_FMT.format(rateShift)}%`,
        icon: 'pi pi-chart-line',
        comparison: null,
      },
    ];
  });

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Reference to the PrimeNG popup Menu used by the ellipsis button.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly menu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Navigation links shown inside the ellipsis popup menu.
   * Derived from the currently active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>(() => {
    const organization: OrganizationOutput | null =
      this.activeOrganizationStore.selectedOrganization();
    const organizationId: string | null = organization ? organization.id : null;
    return [
      {
        label: $localize`:@@dash.viewAll.inspections:View all inspections`,
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'inspections'] : null,
      },
    ];
  });

  //#endregion

  //#region Methods

  /**
   * Method onMenuToggle
   *
   * @description
   * Toggles the ellipsis popup menu open or closed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MouseEvent} event - The click event from the ellipsis button.
   * @returns {void}
   */
  protected onMenuToggle(event: MouseEvent): void {
    this.menu().toggle(event);
  }

  /**
   * Method onFilterToggle
   *
   * @description
   * Opens the draft filter drawer.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected onFilterToggle(): void {
    this.dashboardStore.openFilters();
  }

  /**
   * Method onCancelFilters
   *
   * @description
   * Restores the draft filter state from the applied values and closes the drawer.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected onCancelFilters(): void {
    this.dashboardStore.cancelDraftFilters();
  }

  /**
   * Method onResetFilters
   *
   * @description
   * Resets the draft filter state to its initial defaults.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected onResetFilters(): void {
    this.dashboardStore.resetDraftFilters();
  }

  /**
   * Method onApplyFilters
   *
   * @description
   * Applies the current draft filters and closes the drawer.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected onApplyFilters(): void {
    this.dashboardStore.applyDraftFilters();
  }

  //#endregion
}
