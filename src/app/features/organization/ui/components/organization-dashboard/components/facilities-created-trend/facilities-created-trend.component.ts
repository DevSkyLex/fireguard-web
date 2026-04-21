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
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { FacilitiesCreatedTrendStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSummaryMetric } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildDashboardSingleTrendSummaryMetric,
  buildDashboardSingleTrendViewModel,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { TrendCard } from '@shared/components';
import {
  FacilitiesCreatedChart,
  FacilitiesCreatedFilters,
  FacilitiesCreatedToolbar,
} from './components';
import { TrendFilterDrawer } from '../trend-filter-drawer/trend-filter-drawer.component';

/**
 * Component FacilitiesCreatedTrend
 * @class FacilitiesCreatedTrend
 *
 * @description
 * Dashboard card displaying a bar chart of facilities created over time.
 * All state, filtering and API logic is delegated to
 * {@link FacilitiesCreatedTrendStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-created-trend',
  templateUrl: './facilities-created-trend.component.html',
  imports: [
    TrendCard,
    MenuModule,
    TrendFilterDrawer,
    FacilitiesCreatedToolbar,
    FacilitiesCreatedChart,
    FacilitiesCreatedFilters,
  ],
  providers: [FacilitiesCreatedTrendStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitiesCreatedTrend {
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
   * Kept private — subcomponents inject it directly.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {FacilitiesCreatedTrendStore}
   */
  private readonly dashboardStore: FacilitiesCreatedTrendStore =
    inject<FacilitiesCreatedTrendStore>(
      FacilitiesCreatedTrendStore,
    );

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
  protected readonly isLoading: Signal<boolean> = computed<boolean>(
    () => this.dashboardStore.isQueryLoading(),
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
  protected readonly isFilterDrawerVisible: Signal<boolean> = computed<boolean>(
    () => this.dashboardStore.isFilterDrawerVisible(),
  );

  /**
   * Property summaryMetrics
   * @readonly
   *
   * @description
   * KPI tile fed to {@link TrendCard}: total facilities created with optional
   * previous-period comparison delta.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly DashboardSummaryMetric[]>}
   */
  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => [
    buildDashboardSingleTrendSummaryMetric({
      viewModel: buildDashboardSingleTrendViewModel(
        this.dashboardStore.queryData(),
        this.dashboardStore.compareEnabled(),
      ),
      label: 'Facilities Created',
      icon: 'pi pi-building',
    }),
  ]);

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
        label: 'View all facilities',
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'facilities'] : null,
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
