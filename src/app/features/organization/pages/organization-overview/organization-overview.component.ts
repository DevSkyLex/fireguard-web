import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationFacilityStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
  OrganizationOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import { ActiveOrganizationStore } from '@core/stores/organization';
import {
  OrganizationOverviewFocusBoardComponent,
  OrganizationOverviewMetricsComponent,
  OrganizationOverviewOperationsCardComponent,
  OrganizationOverviewRiskCardComponent,
  OrganizationOverviewTeamCardComponent,
} from './components';
/**
 * Type OverviewQuickActionRoute
 *
 * @description
 * Child routes exposed by the organization overview shortcuts.
 */
type OverviewQuickActionRoute = 'facilities' | 'equipments' | 'inspections';

/**
 * Interface OverviewQuickAction
 *
 * @description
 * Shortcut action displayed in the overview header.
 */
interface OverviewQuickAction {
  readonly label: string;
  readonly route: OverviewQuickActionRoute;
  readonly icon: string;
}

/**
 * Component OrganizationOverviewPage
 * @class OrganizationOverviewPage
 *
 * @description
 * Smart dashboard container for the organization overview route.
 * It coordinates store access, handles route-level actions, and
 * delegates dashboard rendering to focused overview components.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview',
  host: {
    class: 'block h-full',
  },
  imports: [
    DatePipe,
    AvatarModule,
    ButtonModule,
    MessageModule,
    OrganizationOverviewFocusBoardComponent,
    OrganizationOverviewMetricsComponent,
    OrganizationOverviewOperationsCardComponent,
    OrganizationOverviewRiskCardComponent,
    OrganizationOverviewTeamCardComponent,
  ],
  templateUrl: './organization-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewPage {
  //#region Properties
  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Store responsible for loading and exposing organization
   * statistics used by the dashboard.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  protected readonly organizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router instance used for programmatic navigation from
   * quick action buttons.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router =
    inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Active route reference used as the navigation context for quick
   * action links, ensuring that navigations are relative to the current
   * organization overview route.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute =
    inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Currently selected organization displayed by the page header.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationOutput | null>}
   */
  protected readonly organization: Signal<OrganizationOutput | null> =
    this.organizationStore.selectedOrganization;

  /**
   * Property statistics
   * @readonly
   *
   * @description
   * Base organization overview statistics returned by the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationStatisticsOutput | null>}
   */
  protected readonly statistics: Signal<OrganizationStatisticsOutput | null> =
    this.organizationStore.statistics;

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Loading state exposed by the store while statistics requests are
   * in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> =
    this.organizationStore.isLoadingStatistics;

  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * Optional API error surfaced by the dashboard store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly errorMessage: Signal<string | null> = computed<string | null>(() =>
    this.organizationStore.statisticsError()?.message ?? null,
  );

  /**
   * Property equipmentStatistics
   * @readonly
   *
  * @description
  * Equipment-specific dashboard statistics forwarded to child
  * components.
  *
  * @access protected
  * @since 1.0.0
   *
   * @type {Signal<OrganizationEquipmentStatisticsOutput | null>}
   */
  protected readonly equipmentStatistics: Signal<OrganizationEquipmentStatisticsOutput | null> =
    this.organizationStore.equipmentStatistics;

  /**
   * Property facilityStatistics
   * @readonly
   *
   * @description
   * Facility-specific dashboard statistics forwarded to overview
   * child components.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationFacilityStatisticsOutput | null>}
   */
  protected readonly facilityStatistics: Signal<OrganizationFacilityStatisticsOutput | null> =
    this.organizationStore.facilityStatistics;

  /**
   * Property inspectionStatistics
   * @readonly
   *
   * @description
   * Inspection-specific dashboard statistics forwarded to overview
   * child components.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationInspectionStatisticsOutput | null>}
   */
  protected readonly inspectionStatistics: Signal<OrganizationInspectionStatisticsOutput | null> =
    this.organizationStore.inspectionStatistics;

  /**
   * Property membershipStatistics
   * @readonly
   *
   * @description
   * Membership-specific dashboard statistics forwarded to the team
   * overview card.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationMembershipStatisticsOutput | null>}
   */
  protected readonly membershipStatistics: Signal<OrganizationMembershipStatisticsOutput | null> =
    this.organizationStore.membershipStatistics;

  /**
   * Property nonConformityStatistics
   * @readonly
   *
   * @description
   * Non-conformity statistics consumed by risk-related visual blocks.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationNonConformityStatisticsOutput | null>}
   */
  protected readonly nonConformityStatistics: Signal<OrganizationNonConformityStatisticsOutput | null> =
    this.organizationStore.nonConformityStatistics;

  /**
   * Property showSkeleton
   * @readonly
   *
   * @description
   * Whether the dashboard should render KPI skeletons while the
   * initial statistics payload has not been resolved yet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showSkeleton: Signal<boolean> = computed<boolean>(
    () => this.isLoading() && this.statistics() === null,
  );

  //#endregion

  //#region ViewModel
  /**
   * Property quickActions
   * @readonly
   *
   * @description
   * Static quick links displayed in the overview header actions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly OverviewQuickAction[]}
   */
  protected readonly quickActions: readonly OverviewQuickAction[] = [
    {
      label: 'Open facilities',
      route: 'facilities',
      icon: 'pi pi-building',
    },
    {
      label: 'Review equipments',
      route: 'equipments',
      icon: 'pi pi-box',
    },
    {
      label: 'Track inspections',
      route: 'inspections',
      icon: 'pi pi-clipboard',
    },
  ] as const;

  /**
   * Property snapshotDate
   * @readonly
   *
   * @description
   * Local timestamp displayed in the page header as the current
   * dashboard snapshot reference.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Date}
   */
  protected readonly snapshotDate: Date = new Date();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the component and triggers the initial load of the
   * organization overview statistics through the store.
   *
   * The effect will re-run and refresh the statistics whenever the
   * selected organization changes, ensuring that the dashboard data
   * is always up to date with the current organizational context.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const organizationId: string | undefined = this.organization()?.id;

      if (organizationId) {
        untracked(() => {
          this.organizationStore.ensureStatisticsLoaded(organizationId);
        });
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method navigateTo
   *
   * @description
   * Navigates to a child route of the current
   * organization context.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OverviewQuickActionRoute} route - Target child route to navigate to.
   *
   * @returns {void} - No return value.
   */
  protected navigateTo(route: OverviewQuickActionRoute): void {
    this.router.navigate([route], { relativeTo: this.route });
  }
  //#endregion
}
