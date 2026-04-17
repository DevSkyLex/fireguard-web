import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import {
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import { PrimeIcons } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { AssetGrowthTrendStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSummaryMetric } from '@features/organization/ui/components/organization-dashboard/models';
import {
  DECIMAL_FMT,
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { TrendCard } from '@shared/components';
import {
  AssetGrowthChart,
  AssetGrowthFilters,
  AssetGrowthToolbar,
} from './components';

/**
 * Component AssetGrowthTrend
 * @class AssetGrowthTrend
 *
 * @description
 * Standalone dashboard card that displays equipment and facilities
 * created over time as a combined grouped bar chart.
 *
 * Fetches both trend datasets in parallel via {@link rxResource} and
 * `forkJoin`, aligns them onto a shared time axis using
 * {@link alignDashboardTrendSeries}, and exposes four KPI tiles
 * (Equipment Added, Facilities Added, Combined Growth, Equipment/Facility
 * ratio) above the chart.
 *
 * Supports granularity selection, optional date-range filtering,
 * optional previous-period comparison overlay, and per-dimension
 * type/status/facility-type filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-asset-growth-trend',
  templateUrl: './asset-growth-trend.component.html',
  imports: [
    TrendCard,
    MenuModule,
    AssetGrowthToolbar,
    AssetGrowthChart,
    AssetGrowthFilters,
  ],
  providers: [AssetGrowthTrendStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetGrowthTrend {
  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root store used to read the active organization identifier.
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
   * Local store responsible for fetching and transforming the trend data,
   * exposing the summary metrics and chart data, and holding the component's
   * UI state (selected granularity, filters, etc.).
   *
   * @access private
   * @since 2.0.0
   *
   * @type {AssetGrowthTrendStore}
   */
  private readonly dashboardStore: AssetGrowthTrendStore =
    inject<AssetGrowthTrendStore>(AssetGrowthTrendStore);

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
   * Four KPI tiles fed to {@link TrendCard}: total equipment created, total
   * facilities created, and the previous-period totals for both when compare
   * mode is enabled. Returns an empty array until data is available so the
   * card shows skeletons instead of zero values.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly DashboardSummaryMetric[]>}
   */
  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => {
    const growth = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const equipmentSeries = growth?.equipment?.series ?? [];
    const facilitySeries = growth?.facilities?.series ?? [];
    const equipmentTotal = sumDashboardTrendValues(
      equipmentSeries.map((p) => getDashboardTrendPointValue(p)),
    );
    const facilityTotal = sumDashboardTrendValues(
      facilitySeries.map((p) => getDashboardTrendPointValue(p)),
    );
    const previousEquipmentTotal = sumDashboardTrendValues(
      (growth?.equipment?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const previousFacilityTotal = sumDashboardTrendValues(
      (growth?.facilities?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const assetsPerFacility =
      facilityTotal > 0 ? Number((equipmentTotal / facilityTotal).toFixed(1)) : 0;
    return [
      {
        label: 'Equipment Added',
        value: WHOLE_NUMBER_FMT.format(equipmentTotal),
        icon: 'pi pi-shield',
        comparison: buildDashboardComparison(
          equipmentTotal,
          previousEquipmentTotal,
          compareEnabled,
        ),
      },
      {
        label: 'Facilities Added',
        value: WHOLE_NUMBER_FMT.format(facilityTotal),
        icon: 'pi pi-building',
        comparison: buildDashboardComparison(facilityTotal, previousFacilityTotal, compareEnabled),
      },
      {
        label: 'Combined Growth',
        value: WHOLE_NUMBER_FMT.format(equipmentTotal + facilityTotal),
        icon: 'pi pi-arrow-up-right',
        comparison: buildDashboardComparison(
          equipmentTotal + facilityTotal,
          previousEquipmentTotal + previousFacilityTotal,
          compareEnabled,
        ),
      },
      {
        label: 'Equipment / Facility',
        value: `${DECIMAL_FMT.format(assetsPerFacility)}x`,
        icon: 'pi pi-percentage',
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
   * Derived from the active organization identifier.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>(() => {
    /**
     * Constant organization
     * @const organization
     *
     * @description
     * Currently active organization, used to construct
     * router links for the menu items.
     *
     * @type {OrganizationOutput | null}
     */
    const organization: OrganizationOutput | null =
      this.activeOrganizationStore.selectedOrganization();

    /**
     * Constant organizationId
     * @const organizationId
     *
     * @description
     * Identifier of the currently active organization, used to construct
     * router links for the menu items. If no organization is active, links
     * will be disabled by setting them to null.
     *
     * @type {string | null}
     */
    const organizationId: string | null = organization ? organization.id : null;

    return [
      {
        label: 'View all equipment',
        icon: PrimeIcons.SHIELD,
        routerLink: organizationId ? ['/organizations', organizationId, 'equipment'] : null,
      },
      {
        label: 'View all facilities',
        icon: PrimeIcons.BUILDING,
        routerLink: organizationId ? ['/organizations', organizationId, 'facilities'] : null,
      },
    ];
  });

  /**
   * Method onMenuToggle
   *
   * @description
   * Toggles the ellipsis popup menu open or closed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event from the ellipsis button.
   * @returns {void}
   */
  protected onMenuToggle(event: MouseEvent): void {
    const menu: Menu = this.menu();
    menu.toggle(event);
  }
}
