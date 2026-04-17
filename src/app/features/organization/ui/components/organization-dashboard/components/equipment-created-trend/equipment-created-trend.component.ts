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
import { EquipmentCreatedTrendStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSummaryMetric } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildDashboardSingleTrendSummaryMetric,
  buildDashboardSingleTrendViewModel,
} from '@features/organization/ui/components/organization-dashboard/utils';
import {
  EquipmentCreatedChart,
  EquipmentCreatedFilters,
  EquipmentCreatedToolbar,
} from './components';
import { TrendCard } from '@shared/components';

/**
 * Component EquipmentCreatedTrend
 * @class EquipmentCreatedTrend
 *
 * @description
 * Dashboard card displaying a bar chart of equipment created over time.
 * All state, filtering and API logic is delegated to
 * {@link EquipmentCreatedTrendStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-created-trend',
  templateUrl: './equipment-created-trend.component.html',
  imports: [
    TrendCard,
    MenuModule,
    EquipmentCreatedToolbar,
    EquipmentCreatedChart,
    EquipmentCreatedFilters,
  ],
  providers: [EquipmentCreatedTrendStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreatedTrend {
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
   * @type {EquipmentCreatedTrendStore}
   */
  private readonly dashboardStore: EquipmentCreatedTrendStore =
    inject<EquipmentCreatedTrendStore>(EquipmentCreatedTrendStore);

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
   * KPI tile fed to {@link TrendCard}: total equipment created with optional
   * comparison delta when compare mode is enabled.
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
      label: 'Equipment Created',
      icon: 'pi pi-shield',
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
        label: 'View all equipment',
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'equipment'] : null,
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
