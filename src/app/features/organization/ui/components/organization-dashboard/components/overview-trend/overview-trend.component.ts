import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import {
  buildDifferenceSeries,
  sumDashboardTrendValues,
  sumTrendSeries,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import { PrimeIcons } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OverviewTrendStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSummaryMetric } from '@features/organization/ui/components/organization-dashboard/models';
import {
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { TrendCard } from '@shared/components';
import {
  OverviewChart,
  OverviewFilters,
  OverviewToolbar,
} from './components';

/**
 * Component OverviewTrend
 * @class OverviewTrend
 *
 * @description
 * Dashboard card displaying a multi-series line chart of the operational flow.
 * All state, filtering and API logic is delegated to
 * {@link OverviewTrendStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-overview-trend',
  templateUrl: './overview-trend.component.html',
  imports: [
    TrendCard,
    MenuModule,
    OverviewToolbar,
    OverviewChart,
    OverviewFilters,
  ],
  providers: [OverviewTrendStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTrend {
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
   * @since 2.0.0
   *
   * @type {OverviewTrendStore}
   */
  private readonly dashboardStore: OverviewTrendStore =
    inject<OverviewTrendStore>(OverviewTrendStore);

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * `true` while the trend query is in-flight.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed<boolean>(
    () => this.dashboardStore.isQueryLoading(),
  );

  /**
   * Property summaryMetrics
   * @readonly
   *
   * @description
   * Four KPI tiles fed to {@link TrendCard}: total inspections, opened NCs,
   * resolved NCs, and net NC pressure (opened minus resolved). Comparison deltas
   * are included only when compare mode is enabled. Returns an empty array until
   * data is available so the card shows skeletons instead of zero values.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly DashboardSummaryMetric[]>}
   */
  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => {
    const result = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const [inspectionData = [], openedData = [], resolvedData = []] =
      this.dashboardStore.alignedTrendData().datasets;
    const netPressureData = buildDifferenceSeries(openedData, resolvedData);
    const inspectionTotal = sumDashboardTrendValues(inspectionData);
    const openedTotal = sumDashboardTrendValues(openedData);
    const resolvedTotal = sumDashboardTrendValues(resolvedData);
    const netPressureTotal = sumDashboardTrendValues(netPressureData);
    const previousInspectionTotal = sumTrendSeries(result?.inspections?.comparison?.series);
    const previousOpenedTotal = sumTrendSeries(result?.ncOpened?.comparison?.series);
    const previousResolvedTotal = sumTrendSeries(result?.ncResolved?.comparison?.series);
    const previousNetPressure = previousOpenedTotal - previousResolvedTotal;
    return [
      {
        label: 'Inspections',
        value: WHOLE_NUMBER_FMT.format(inspectionTotal),
        icon: 'pi pi-list-check',
        comparison: buildDashboardComparison(
          inspectionTotal,
          previousInspectionTotal,
          compareEnabled,
        ),
      },
      {
        label: 'Opened NC',
        value: WHOLE_NUMBER_FMT.format(openedTotal),
        icon: 'pi pi-exclamation-triangle',
        comparison: buildDashboardComparison(openedTotal, previousOpenedTotal, compareEnabled),
      },
      {
        label: 'Resolved NC',
        value: WHOLE_NUMBER_FMT.format(resolvedTotal),
        icon: 'pi pi-check-circle',
        comparison: buildDashboardComparison(resolvedTotal, previousResolvedTotal, compareEnabled),
      },
      {
        label: 'Net Pressure',
        value: WHOLE_NUMBER_FMT.format(netPressureTotal),
        icon: 'pi pi-gauge',
        comparison: buildDashboardComparison(netPressureTotal, previousNetPressure, compareEnabled),
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
        label: 'View all inspections',
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

  //#endregion
}
