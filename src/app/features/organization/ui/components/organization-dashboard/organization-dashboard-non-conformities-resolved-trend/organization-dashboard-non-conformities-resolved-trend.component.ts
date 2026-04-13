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
import { OrganizationDashboardNonConformitiesResolvedStore } from '@features/organization/state/organization-dashboard';
import { TrendCard } from '@shared/components/trend-card';

/**
 * Component OrganizationDashboardNonConformitiesResolvedTrend
 * @class OrganizationDashboardNonConformitiesResolvedTrend
 *
 * @description
 * Dashboard card that displays a line chart of the resolved non-conformities
 * trend. All state, filtering and API logic is delegated to
 * {@link OrganizationDashboardNonConformitiesResolvedStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-non-conformities-resolved-trend',
  templateUrl: './organization-dashboard-non-conformities-resolved-trend.component.html',
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
  providers: [OrganizationDashboardNonConformitiesResolvedStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardNonConformitiesResolvedTrend {
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
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationDashboardNonConformitiesResolvedStore}
   */
  protected readonly dashboardStore: OrganizationDashboardNonConformitiesResolvedStore =
    inject<OrganizationDashboardNonConformitiesResolvedStore>(
      OrganizationDashboardNonConformitiesResolvedStore,
    );

  /**
   * Property today
   * @readonly
   *
   * @description
   * Upper bound for the date picker. Prevents selecting future dates.
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
