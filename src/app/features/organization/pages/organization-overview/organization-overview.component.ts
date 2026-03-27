import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type {
  OrganizationDashboardStatistics,
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
import type {
  OverviewBreakdownItem,
  OverviewFocusBoardItem,
  OverviewHeadlineMetric,
  OverviewPulseFilter,
  OverviewPulseReadout,
  OverviewQuickAction,
  OverviewToggleOption,
} from './organization-overview.types';

interface OrganizationOverviewStatisticsSnapshot {
  readonly overview: OrganizationStatisticsOutput | null;
  readonly equipment: OrganizationEquipmentStatisticsOutput | null;
  readonly facilities: OrganizationFacilityStatisticsOutput | null;
  readonly inspections: OrganizationInspectionStatisticsOutput | null;
  readonly membership: OrganizationMembershipStatisticsOutput | null;
  readonly nonConformities: OrganizationNonConformityStatisticsOutput | null;
}

function toTitleCaseToken(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toSortedBreakdown(
  counts: Readonly<Record<string, number>> | null | undefined,
): readonly OverviewBreakdownItem[] {
  return Object.entries(counts ?? {})
    .map(([label, value]: [string, number]) => ({
      label: toTitleCaseToken(label),
      value,
    }))
    .sort(
      (left: OverviewBreakdownItem, right: OverviewBreakdownItem) =>
        right.value - left.value,
    );
}

function toPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return '0%';
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function getResolvedFindingsCount(
  statistics: OrganizationNonConformityStatisticsOutput | null,
): number {
  return (statistics?.doneCount ?? 0) + (statistics?.waivedCount ?? 0);
}

function getOpenFindingsCount(
  statistics: OrganizationNonConformityStatisticsOutput | null,
): number {
  return (statistics?.openCount ?? 0) + (statistics?.inProgressCount ?? 0);
}

/**
 * Component OrganizationOverviewPage
 * @class OrganizationOverviewPage
 *
 * @description
 * Smart dashboard container for the organization overview route.
 * It coordinates store access, prepares the page view-model with
 * local computed signals, and delegates rendering to focused
 * presentational components.
 *
 * The transformation logic is intentionally colocated here because
 * it is specific to this page and not reused elsewhere.
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
  //#region Dependencies
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

  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  //#endregion

  //#region State
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
    computed<OrganizationOutput | null>(() => this.organizationStore.selectedOrganization());

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
    computed<OrganizationStatisticsOutput | null>(() => this.organizationStore.statistics());

  /**
   * Property dashboardStatistics
   * @readonly
   *
   * @description
   * Aggregated dashboard statistics payload used by overview cards.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationDashboardStatistics | null>}
   */
  protected readonly dashboardStatistics: Signal<OrganizationDashboardStatistics | null> =
    computed<OrganizationDashboardStatistics | null>(() => this.organizationStore.dashboardStatistics());

  /**
   * Property statisticsSnapshot
   * @readonly
   *
   * @description
   * Normalized snapshot that avoids repeating null-safe traversal
   * across all dashboard view-model computations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OrganizationOverviewStatisticsSnapshot>}
   */
  protected readonly statisticsSnapshot: Signal<OrganizationOverviewStatisticsSnapshot> =
    computed<OrganizationOverviewStatisticsSnapshot>(() => ({
      overview: this.statistics(),
      equipment: this.dashboardStatistics()?.equipment ?? null,
      facilities: this.dashboardStatistics()?.facilities ?? null,
      inspections: this.dashboardStatistics()?.inspections ?? null,
      membership: this.dashboardStatistics()?.membership ?? null,
      nonConformities: this.dashboardStatistics()?.nonConformities ?? null,
    }));

  protected readonly loadedStatisticsResource: Signal<string | null> = computed<string | null>(
    () => this.dashboardStatistics()?.overview['@id'] ?? null,
  );

  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.organizationStore.isLoadingStatistics());

  protected readonly errorMessage: Signal<string | null> = computed<string | null>(() =>
    this.organizationStore.statisticsError()?.message ?? null,
  );

  protected readonly equipmentStatistics = computed(
    () => this.statisticsSnapshot().equipment,
  );
  protected readonly facilityStatistics = computed(
    () => this.statisticsSnapshot().facilities,
  );
  protected readonly inspectionStatistics = computed(
    () => this.statisticsSnapshot().inspections,
  );
  protected readonly membershipStatistics = computed(
    () => this.statisticsSnapshot().membership,
  );
  protected readonly nonConformityStatistics = computed(
    () => this.statisticsSnapshot().nonConformities,
  );

  protected readonly showSkeleton: Signal<boolean> = computed<boolean>(
    () => this.isLoading() && this.dashboardStatistics() === null,
  );

  protected readonly hasDashboardStatistics: Signal<boolean> = computed<boolean>(
    () => this.dashboardStatistics() !== null,
  );

  protected readonly activePulseFilter = signal<OverviewPulseFilter>('all');
  //#endregion

  //#region ViewModel
  protected readonly pulseFilterOptions: readonly OverviewToggleOption<OverviewPulseFilter>[] = [
    { label: 'Live', value: 'live' },
    { label: '30 days', value: '30days' },
    { label: 'Health', value: 'health' },
    { label: 'Risk', value: 'risk' },
    { label: 'All', value: 'all' },
  ];

  protected readonly quickActions: readonly OverviewQuickAction[] = [
    {
      label: 'Open facilities',
      description: 'Browse sites, buildings, and monitored areas.',
      route: 'facilities',
      icon: 'pi pi-building',
    },
    {
      label: 'Review equipments',
      description: 'Inspect operational inventory and maintenance needs.',
      route: 'equipments',
      icon: 'pi pi-box',
    },
    {
      label: 'Track inspections',
      description: 'Follow recent inspections and open findings.',
      route: 'inspections',
      icon: 'pi pi-clipboard',
    },
  ] as const;

  protected readonly snapshotDate: Date = new Date();

  protected readonly equipmentTypeBreakdown: Signal<readonly OverviewBreakdownItem[]> =
    computed<readonly OverviewBreakdownItem[]>(() =>
      toSortedBreakdown(this.equipmentStatistics()?.countsByType),
    );

  protected readonly facilityTypeBreakdown: Signal<readonly OverviewBreakdownItem[]> =
    computed<readonly OverviewBreakdownItem[]>(() =>
      toSortedBreakdown(this.facilityStatistics()?.countsByType),
    );

  protected readonly inspectorTypeBreakdown: Signal<readonly OverviewBreakdownItem[]> =
    computed<readonly OverviewBreakdownItem[]>(() =>
      toSortedBreakdown(this.inspectionStatistics()?.countsByInspectorType),
    );

  protected readonly headlineMetrics: Signal<readonly OverviewHeadlineMetric[]> = computed<
    readonly OverviewHeadlineMetric[]
  >(() => {
    const snapshot = this.statisticsSnapshot();

    return [
      {
        label: 'Active footprint',
        value: `${snapshot.overview?.activeFacilityCount ?? 0}`,
        helper: `${snapshot.overview?.facilityCount ?? 0} mapped facilities`,
        badgeLabel: `${toPercent(
          snapshot.overview?.activeFacilityCount ?? 0,
          snapshot.overview?.facilityCount ?? 0,
        )} online`,
        badgeSeverity: 'success',
      },
      {
        label: 'Operational assets',
        value: `${snapshot.equipment?.operationalCount ?? 0}`,
        helper: `${snapshot.equipment?.underMaintenanceCount ?? 0} under maintenance`,
        badgeLabel: `${toPercent(
          snapshot.equipment?.operationalCount ?? 0,
          snapshot.equipment?.totalCount ?? 0,
        )} ready`,
        badgeSeverity: 'info',
      },
      {
        label: 'Inspections / 30 days',
        value: `${snapshot.inspections?.performedLast30DaysCount ?? 0}`,
        helper: `${snapshot.inspections?.closedCount ?? 0} already closed`,
        badgeLabel: `${snapshot.inspections?.performedLast7DaysCount ?? 0} this week`,
        badgeSeverity: 'contrast',
      },
    ] as const;
  });

  protected readonly operationsReadouts: Signal<readonly OverviewPulseReadout[]> = computed<
    readonly OverviewPulseReadout[]
  >(() => {
    const snapshot = this.statisticsSnapshot();
    const resolvedFindings: number = getResolvedFindingsCount(snapshot.nonConformities);
    const openFindings: number = getOpenFindingsCount(snapshot.nonConformities);

    return [
      {
        label: 'Facilities',
        value: `${snapshot.overview?.activeFacilityCount ?? 0}/${snapshot.overview?.facilityCount ?? 0}`,
        helper: `${this.facilityTypeBreakdown().length} tracked types`,
      },
      {
        label: 'Assets',
        value: `${snapshot.equipment?.operationalCount ?? 0}/${snapshot.equipment?.totalCount ?? 0}`,
        helper: `${snapshot.equipment?.underMaintenanceCount ?? 0} in maintenance`,
      },
      {
        label: 'Inspections',
        value: `${snapshot.inspections?.closedCount ?? 0}/${snapshot.inspections?.totalCount ?? 0}`,
        helper: `${snapshot.inspections?.passCount ?? 0} passed`,
      },
      {
        label: 'Members',
        value: `${snapshot.membership?.activeMemberCount ?? 0}/${snapshot.membership?.memberCount ?? 0}`,
        helper: `${snapshot.membership?.roleCount ?? 0} active roles`,
      },
      {
        label: 'Findings',
        value: `${resolvedFindings}/${snapshot.nonConformities?.totalCount ?? 0}`,
        helper: `${openFindings} still open`,
      },
    ] as const;
  });

  protected readonly focusBoardItems: Signal<readonly OverviewFocusBoardItem[]> = computed<
    readonly OverviewFocusBoardItem[]
  >(() => {
    const topEquipment = this.equipmentTypeBreakdown()[0];
    const topFacility = this.facilityTypeBreakdown()[0];
    const topInspector = this.inspectorTypeBreakdown()[0];
    const snapshot = this.statisticsSnapshot();

    return [
      {
        label: 'Top equipment type',
        value: `${topEquipment?.value ?? 0}`,
        helper: topEquipment?.label ?? 'No breakdown available yet',
        severity: 'info',
      },
      {
        label: 'Primary facility type',
        value: `${topFacility?.value ?? 0}`,
        helper: topFacility?.label ?? 'No facility mix available yet',
        severity: 'success',
      },
      {
        label: 'Inspection pass rate',
        value: toPercent(snapshot.inspections?.passCount ?? 0, snapshot.inspections?.totalCount ?? 0),
        helper: topInspector
          ? `Mostly handled by ${topInspector.label}`
          : 'No inspector mix available yet',
        severity: 'contrast',
      },
      {
        label: 'Pending invitations',
        value: `${snapshot.membership?.pendingInvitationCount ?? 0}`,
        helper: `${getOpenFindingsCount(snapshot.nonConformities)} findings still need attention`,
        severity: 'warn',
      },
    ] as const;
  });

  //#endregion

  public constructor() {
    effect(() => {
      const organizationId: string | undefined = this.organization()?.id;
      const expectedStatisticsResource: string | null = organizationId
        ? `/api/organizations/${organizationId}/statistics`
        : null;
      const loadedStatisticsResource: string | null = this.loadedStatisticsResource();

      if (organizationId && loadedStatisticsResource !== expectedStatisticsResource) {
        untracked(() => {
          this.organizationStore.loadStatistics(organizationId);
        });
      }
    });
  }

  /**
   * Method navigateTo
   *
   * @description
   * Navigates to a child route of the current organization context.
   *
   * @param route Child route to open from the overview page.
   */
  protected navigateTo(route: OverviewQuickAction['route']): void {
    this.router.navigate([route], { relativeTo: this.route });
  }
}
