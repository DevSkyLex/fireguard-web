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
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSummaryMetric } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildDashboardSingleTrendSummaryMetric,
  buildDashboardSingleTrendViewModel,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { TrendCard } from '@shared/components';
import {
  NonConformitiesOpenedChart,
  NonConformitiesOpenedFilters,
  NonConformitiesOpenedToolbar,
} from './components';

/**
 * Component NonConformitiesOpenedTrend
 * @class NonConformitiesOpenedTrend
 *
 * @description
 * Dumb component that displays a line chart of the opened non-conformities trend.
 * Receives trend data and loading state via signal inputs and emits
 * period change events so the parent can reload the data accordingly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-opened-trend',
  templateUrl: './non-conformities-opened-trend.component.html',
  imports: [
    TrendCard,
    MenuModule,
    NonConformitiesOpenedToolbar,
    NonConformitiesOpenedChart,
    NonConformitiesOpenedFilters,
  ],
  providers: [OrganizationDashboardNonConformitiesOpenedStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesOpenedTrend {
  //#region Properties
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
   * Local store that owns all state, chart data and API calls for this card.
   * Kept private — subcomponents inject it directly.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationDashboardNonConformitiesOpenedStore}
   */
  private readonly dashboardStore: OrganizationDashboardNonConformitiesOpenedStore =
    inject<OrganizationDashboardNonConformitiesOpenedStore>(
      OrganizationDashboardNonConformitiesOpenedStore,
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
   * Property summaryMetrics
   * @readonly
   *
   * @description
   * KPI tile fed to {@link TrendCard}: total opened NCs with optional
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
      label: 'Opened NC',
      icon: 'pi pi-exclamation-triangle',
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
        label: 'View all non-conformities',
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
