import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeIcons } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleButtonModule } from 'primeng/togglebutton';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { TrendCard } from '@shared/components/trend-card';

/**
 * Component OrganizationDashboardAssetGrowthTrend
 * @class OrganizationDashboardAssetGrowthTrend
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
  selector: 'app-organization-dashboard-asset-growth-trend',
  templateUrl: './organization-dashboard-asset-growth-trend.component.html',
  imports: [
    TrendCard,
    FormsModule,
    ButtonModule,
    ChartModule,
    DatePickerModule,
    InputGroupAddonModule,
    InputGroupModule,
    MenuModule,
    SelectModule,
    SkeletonModule,
    ToggleButtonModule,
  ],
  providers: [OrganizationDashboardAssetGrowthStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardAssetGrowthTrend {
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
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationDashboardAssetGrowthStore}
   */
  protected readonly dashboardStore: OrganizationDashboardAssetGrowthStore =
    inject<OrganizationDashboardAssetGrowthStore>(OrganizationDashboardAssetGrowthStore);

  /**
   * Property today
   * @readonly
   *
   * @description
   * Upper bound for the date picker. Set once at component creation
   * to prevent selecting future dates.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Date}
   */
  protected readonly today: Date = new Date();

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
