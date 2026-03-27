import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, untracked, type Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageModule } from 'primeng/message';
import type { ChartData, ChartOptions } from 'chart.js';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardStatistics,
  OrganizationOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import {
  OrganizationOverviewFocusBoardComponent,
  OrganizationOverviewHeaderComponent,
  OrganizationOverviewMetricsComponent,
  OrganizationOverviewOperationsCardComponent,
  OrganizationOverviewQuickActionsComponent,
  OrganizationOverviewRiskCardComponent,
  OrganizationOverviewTeamCardComponent,
} from './components';
import type {
  OverviewFocusBoardItem,
  OverviewHeadlineMetric,
  OverviewMeterValue,
  OverviewPulseReadout,
  OverviewQuickAction,
  OverviewToggleOption,
} from './organization-overview.types';

interface BreakdownItem {
  readonly label: string;
  readonly value: number;
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
): BreakdownItem[] {
  return Object.entries(counts ?? {})
    .map(([label, value]: [string, number]) => ({
      label: toTitleCaseToken(label),
      value,
    }))
    .sort((left: BreakdownItem, right: BreakdownItem) => right.value - left.value);
}

function toPercentValue(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function toPercent(numerator: number, denominator: number): string {
  return `${toPercentValue(numerator, denominator)}%`;
}

@Component({
  selector: 'app-organization-overview',
  imports: [
    MessageModule,
    OrganizationOverviewFocusBoardComponent,
    OrganizationOverviewHeaderComponent,
    OrganizationOverviewMetricsComponent,
    OrganizationOverviewOperationsCardComponent,
    OrganizationOverviewQuickActionsComponent,
    OrganizationOverviewRiskCardComponent,
    OrganizationOverviewTeamCardComponent,
  ],
  templateUrl: './organization-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewPage {
  protected readonly organizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  protected readonly organization: Signal<OrganizationOutput | null> =
    computed<OrganizationOutput | null>(() => this.organizationStore.selectedOrganization());

  protected readonly statistics: Signal<OrganizationStatisticsOutput | null> =
    computed<OrganizationStatisticsOutput | null>(() => this.organizationStore.statistics());

  protected readonly dashboardStatistics: Signal<OrganizationDashboardStatistics | null> =
    computed<OrganizationDashboardStatistics | null>(() => this.organizationStore.dashboardStatistics());

  protected readonly loadedStatisticsResource: Signal<string | null> = computed<string | null>(
    () => this.dashboardStatistics()?.overview['@id'] ?? null,
  );

  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.organizationStore.isLoadingStatistics());

  protected readonly errorMessage: Signal<string | null> = computed<string | null>(() =>
    this.organizationStore.statisticsError()?.message ?? null,
  );

  protected readonly equipmentStatistics = computed(() => this.dashboardStatistics()?.equipment ?? null);
  protected readonly facilityStatistics = computed(() => this.dashboardStatistics()?.facilities ?? null);
  protected readonly inspectionStatistics = computed(() => this.dashboardStatistics()?.inspections ?? null);
  protected readonly membershipStatistics = computed(() => this.dashboardStatistics()?.membership ?? null);
  protected readonly nonConformityStatistics = computed(
    () => this.dashboardStatistics()?.nonConformities ?? null,
  );

  protected readonly equipmentTypeBreakdown: Signal<readonly BreakdownItem[]> =
    computed<readonly BreakdownItem[]>(() =>
      toSortedBreakdown(this.equipmentStatistics()?.countsByType),
    );

  protected readonly facilityTypeBreakdown: Signal<readonly BreakdownItem[]> =
    computed<readonly BreakdownItem[]>(() =>
      toSortedBreakdown(this.facilityStatistics()?.countsByType),
    );

  protected readonly inspectorTypeBreakdown: Signal<readonly BreakdownItem[]> =
    computed<readonly BreakdownItem[]>(() =>
      toSortedBreakdown(this.inspectionStatistics()?.countsByInspectorType),
    );

  protected readonly showSkeleton: Signal<boolean> = computed<boolean>(
    () => this.isLoading() && this.dashboardStatistics() === null,
  );

  protected readonly activeHeaderMode = signal<string>('overview');
  protected readonly activePulseFilter = signal<string>('all');

  protected readonly hasDashboardStatistics: Signal<boolean> = computed<boolean>(
    () => this.dashboardStatistics() !== null,
  );

  protected readonly headerModeOptions: OverviewToggleOption[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Operations', value: 'operations' },
    { label: 'Compliance', value: 'compliance' },
  ];

  protected readonly pulseFilterOptions: OverviewToggleOption[] = [
    { label: 'Live', value: 'live' },
    { label: '30 days', value: '30days' },
    { label: 'Health', value: 'health' },
    { label: 'Risk', value: 'risk' },
    { label: 'All', value: 'all' },
  ];

  protected readonly snapshotDateLabel: string = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  protected readonly quickActions: ReadonlyArray<OverviewQuickAction> = [
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

  protected readonly headlineMetrics: Signal<readonly OverviewHeadlineMetric[]> = computed<
    readonly OverviewHeadlineMetric[]
  >(() => {
    const overview = this.statistics();
    const equipment = this.equipmentStatistics();
    const inspections = this.inspectionStatistics();

    return [
      {
        label: 'Active footprint',
        value: `${overview?.activeFacilityCount ?? 0}`,
        helper: `${overview?.facilityCount ?? 0} mapped facilities`,
        badgeLabel: `${toPercent(
          overview?.activeFacilityCount ?? 0,
          overview?.facilityCount ?? 0,
        )} online`,
        badgeSeverity: 'success',
      },
      {
        label: 'Operational assets',
        value: `${equipment?.operationalCount ?? 0}`,
        helper: `${equipment?.underMaintenanceCount ?? 0} under maintenance`,
        badgeLabel: `${toPercent(
          equipment?.operationalCount ?? 0,
          equipment?.totalCount ?? 0,
        )} ready`,
        badgeSeverity: 'info',
      },
      {
        label: 'Inspections / 30 days',
        value: `${inspections?.performedLast30DaysCount ?? 0}`,
        helper: `${inspections?.closedCount ?? 0} already closed`,
        badgeLabel: `${inspections?.performedLast7DaysCount ?? 0} this week`,
        badgeSeverity: 'contrast',
      },
    ] as const;
  });

  protected readonly operationsReadouts: Signal<readonly OverviewPulseReadout[]> = computed<
    readonly OverviewPulseReadout[]
  >(() => {
    const overview = this.statistics();
    const equipment = this.equipmentStatistics();
    const inspections = this.inspectionStatistics();
    const membership = this.membershipStatistics();
    const nonConformities = this.nonConformityStatistics();

    const resolvedFindings: number =
      (nonConformities?.doneCount ?? 0) + (nonConformities?.waivedCount ?? 0);
    const openFindings: number =
      (nonConformities?.openCount ?? 0) + (nonConformities?.inProgressCount ?? 0);

    return [
      {
        label: 'Facilities',
        value: `${overview?.activeFacilityCount ?? 0}/${overview?.facilityCount ?? 0}`,
        helper: `${this.facilityTypeBreakdown().length} tracked types`,
      },
      {
        label: 'Assets',
        value: `${equipment?.operationalCount ?? 0}/${equipment?.totalCount ?? 0}`,
        helper: `${equipment?.underMaintenanceCount ?? 0} in maintenance`,
      },
      {
        label: 'Inspections',
        value: `${inspections?.closedCount ?? 0}/${inspections?.totalCount ?? 0}`,
        helper: `${inspections?.passCount ?? 0} passed`,
      },
      {
        label: 'Members',
        value: `${membership?.activeMemberCount ?? 0}/${membership?.memberCount ?? 0}`,
        helper: `${membership?.roleCount ?? 0} active roles`,
      },
      {
        label: 'Findings',
        value: `${resolvedFindings}/${nonConformities?.totalCount ?? 0}`,
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
    const inspections = this.inspectionStatistics();
    const membership = this.membershipStatistics();
    const nonConformities = this.nonConformityStatistics();

    const openFindings: number =
      (nonConformities?.openCount ?? 0) + (nonConformities?.inProgressCount ?? 0);

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
        value: toPercent(inspections?.passCount ?? 0, inspections?.totalCount ?? 0),
        helper: topInspector
          ? `Mostly handled by ${topInspector.label}`
          : 'No inspector mix available yet',
        severity: 'contrast',
      },
      {
        label: 'Pending invitations',
        value: `${membership?.pendingInvitationCount ?? 0}`,
        helper: `${openFindings} findings still need attention`,
        severity: 'warn',
      },
    ] as const;
  });

  protected readonly riskMeterValues: Signal<OverviewMeterValue[]> = computed<OverviewMeterValue[]>(() => {
    const stats = this.nonConformityStatistics();

    return [
      {
        label: 'Critical',
        value: stats?.criticalSeverityCount ?? 0,
        color: '#ef4444',
      },
      {
        label: 'High',
        value: stats?.highSeverityCount ?? 0,
        color: '#f97316',
      },
      {
        label: 'Medium',
        value: stats?.mediumSeverityCount ?? 0,
        color: '#f59e0b',
      },
      {
        label: 'Low',
        value: stats?.lowSeverityCount ?? 0,
        color: '#22c55e',
      },
    ];
  });

  protected readonly riskMeterMax: Signal<number> = computed<number>(() =>
    Math.max(this.nonConformityStatistics()?.totalCount ?? 0, 1),
  );

  protected readonly operationsPulseChartData: Signal<ChartData<'line', number[], string>> =
    computed<ChartData<'line', number[], string>>(() => {
      const overview = this.statistics();
      const equipment = this.equipmentStatistics();
      const inspections = this.inspectionStatistics();
      const membership = this.membershipStatistics();
      const nonConformities = this.nonConformityStatistics();

      const resolvedFindings: number =
        (nonConformities?.doneCount ?? 0) + (nonConformities?.waivedCount ?? 0);

      return {
        labels: ['Facilities', 'Assets', 'Inspections', 'Members', 'Findings'],
        datasets: [
          {
            label: 'Volume',
            data: [
              overview?.facilityCount ?? 0,
              equipment?.totalCount ?? 0,
              inspections?.totalCount ?? 0,
              membership?.memberCount ?? 0,
              nonConformities?.totalCount ?? 0,
            ],
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.12)',
            pointBackgroundColor: '#0ea5e9',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
          },
          {
            label: 'Healthy / resolved',
            data: [
              overview?.activeFacilityCount ?? 0,
              equipment?.operationalCount ?? 0,
              inspections?.closedCount ?? 0,
              membership?.activeMemberCount ?? 0,
              resolvedFindings,
            ],
            borderColor: '#1d4ed8',
            backgroundColor: 'rgba(29, 78, 216, 0.08)',
            pointBackgroundColor: '#1d4ed8',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
          },
        ],
      };
    });

  protected readonly teamOverviewChartData: Signal<ChartData<'bar', number[], string>> =
    computed<ChartData<'bar', number[], string>>(() => {
      const membership = this.membershipStatistics();

      return {
        labels: ['Active', 'Inactive', 'Roles', 'Accepted', 'Pending', 'Expired'],
        datasets: [
          {
            label: 'Organization activity',
            data: [
              membership?.activeMemberCount ?? 0,
              membership?.inactiveMemberCount ?? 0,
              membership?.roleCount ?? 0,
              membership?.acceptedInvitationCount ?? 0,
              membership?.pendingInvitationCount ?? 0,
              membership?.expiredInvitationCount ?? 0,
            ],
            backgroundColor: ['#0ea5e9', '#60a5fa', '#93c5fd', '#0284c7', '#7dd3fc', '#dbeafe'],
            borderRadius: 16,
            borderSkipped: false,
            maxBarThickness: 28,
          },
        ],
      };
    });

  protected readonly operationsPulseChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: {
          color: '#64748b',
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
      },
    },
  };

  protected readonly teamOverviewChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: {
          color: '#64748b',
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.16)',
        },
      },
    },
  };

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

  protected navigateTo(route: string): void {
    this.router.navigate([route], { relativeTo: this.route });
  }
}
