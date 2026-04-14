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
import { OrganizationDashboardInspectionQualityStore } from '@features/organization/state/organization-dashboard';
import { TrendCard } from '@shared/components';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import {
  alignDashboardTrendSeries,
  buildPercentageSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import {
  INSPECTION_RESULT_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  INSPECTOR_TYPE_OPTIONS,
  NON_CONFORMITY_SEVERITY_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import type {
  DashboardSummaryMetric,
  InspectionResultOption,
  InspectionStatusOption,
  InspectorTypeOption,
  NonConformitySeverityOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  DECIMAL_FMT,
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * Component OrganizationDashboardInspectionQualityTrend
 * @class OrganizationDashboardInspectionQualityTrend
 *
 * @description
 * Dashboard card displaying a bar chart of inspection quality versus
 * non-conformity pressure. All state, filtering and API logic is delegated to
 * {@link OrganizationDashboardInspectionQualityStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-inspection-quality-trend',
  templateUrl: './organization-dashboard-inspection-quality-trend.component.html',
  imports: [
    TrendCard,
    FormsModule,
    ButtonModule,
    ChartModule,
    MenuModule,
    SkeletonModule,
    SelectModule,
    InputGroupModule,
    InputGroupAddonModule,
    ToggleButtonModule,
    DatePickerModule,
  ],
  providers: [OrganizationDashboardInspectionQualityStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardInspectionQualityTrend {
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
   * @type {OrganizationDashboardInspectionQualityStore}
   */
  protected readonly dashboardStore: OrganizationDashboardInspectionQualityStore =
    inject<OrganizationDashboardInspectionQualityStore>(
      OrganizationDashboardInspectionQualityStore,
    );

  protected readonly inspectionStatusOptions: InspectionStatusOption[] = [...INSPECTION_STATUS_OPTIONS];

  protected readonly inspectionResultOptions: InspectionResultOption[] = [...INSPECTION_RESULT_OPTIONS];

  protected readonly inspectorTypeOptions: InspectorTypeOption[] = [...INSPECTOR_TYPE_OPTIONS];

  protected readonly nonConformitySeverityOptions: NonConformitySeverityOption[] = [...NON_CONFORMITY_SEVERITY_OPTIONS];

  protected readonly selectedInspectionStatusOption: Signal<InspectionStatusOption | null> = computed(
    () => INSPECTION_STATUS_OPTIONS.find((o) => o.value === this.dashboardStore.selectedInspectionStatus()) ?? null,
  );

  protected readonly selectedInspectionResultOption: Signal<InspectionResultOption | null> = computed(
    () => INSPECTION_RESULT_OPTIONS.find((o) => o.value === this.dashboardStore.selectedInspectionResult()) ?? null,
  );

  protected readonly selectedSeverityOption: Signal<NonConformitySeverityOption | null> = computed(
    () => NON_CONFORMITY_SEVERITY_OPTIONS.find((o) => o.value === this.dashboardStore.selectedNonConformitySeverity()) ?? null,
  );

  private readonly rateSeries: Signal<readonly number[]> = computed(() => {
    const data = this.dashboardStore.queryData();
    const aligned = alignDashboardTrendSeries(
      [data?.inspections?.series, data?.ncOpened?.series],
      this.dashboardStore.selectedGranularity(),
    );
    const [inspectionData = [], ncOpenedData = []] = aligned.datasets;
    return buildPercentageSeries(ncOpenedData, inspectionData);
  });

  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => {
    const data = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const inspectionTotal = sumDashboardTrendValues(
      (data?.inspections?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const ncOpenedTotal = sumDashboardTrendValues(
      (data?.ncOpened?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const previousInspectionTotal = sumDashboardTrendValues(
      (data?.inspections?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const previousNcOpenedTotal = sumDashboardTrendValues(
      (data?.ncOpened?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const ncRate = inspectionTotal > 0 ? (ncOpenedTotal / inspectionTotal) * 100 : 0;
    const previousNcRate =
      previousInspectionTotal > 0 ? (previousNcOpenedTotal / previousInspectionTotal) * 100 : 0;
    const currentRates = this.rateSeries();
    const rateShift = currentRates.length >= 2
      ? currentRates[currentRates.length - 1] - currentRates[0]
      : 0;
    return [
      {
        label: 'Inspections',
        value: WHOLE_NUMBER_FMT.format(inspectionTotal),
        icon: 'pi pi-clipboard',
        comparison: buildDashboardComparison(inspectionTotal, previousInspectionTotal, compareEnabled),
      },
      {
        label: 'Opened NC',
        value: WHOLE_NUMBER_FMT.format(ncOpenedTotal),
        icon: 'pi pi-exclamation-triangle',
        comparison: buildDashboardComparison(ncOpenedTotal, previousNcOpenedTotal, compareEnabled),
      },
      {
        label: 'NC Rate',
        value: `${DECIMAL_FMT.format(ncRate)}%`,
        icon: 'pi pi-percentage',
        comparison: buildDashboardComparison(ncRate, previousNcRate, compareEnabled),
      },
      {
        label: 'Rate Shift',
        value: `${rateShift >= 0 ? '+' : ''}${DECIMAL_FMT.format(rateShift)}%`,
        icon: 'pi pi-chart-line',
        comparison: null,
      },
    ];
  });

  protected readonly chartData: Signal<ChartData<'bar' | 'line'>> = computed(() => {
    const data = this.dashboardStore.queryData();
    const aligned = alignDashboardTrendSeries(
      [data?.inspections?.series, data?.ncOpened?.series],
      this.dashboardStore.selectedGranularity(),
    );
    const [inspectionData = [], ncOpenedData = []] = aligned.datasets;
    const rateData = buildPercentageSeries(ncOpenedData, inspectionData);
    const selectedResult = this.dashboardStore.selectedInspectionResult();
    const selectedStatus = this.dashboardStore.selectedInspectionStatus();
    const inspectionHex = selectedResult
      ? (INSPECTION_RESULT_OPTIONS.find((o) => o.value === selectedResult)?.color ?? '#3b82f6')
      : selectedStatus
        ? (INSPECTION_STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.color ?? '#3b82f6')
        : '#3b82f6';
    const selectedSeverity = this.dashboardStore.selectedNonConformitySeverity();
    const ncHex = selectedSeverity
      ? (NON_CONFORMITY_SEVERITY_OPTIONS.find((o) => o.value === selectedSeverity)?.color ?? '#f97316')
      : '#f97316';
    const [ir, ig, ib] = hexToRgb(inspectionHex);
    const [nr, ng, nb] = hexToRgb(ncHex);
    return {
      labels: [...aligned.labels],
      datasets: [
        {
          label: 'Inspections',
          data: inspectionData,
          backgroundColor: (context: ScriptableContext<'bar'>) => {
            const { ctx, chartArea } = context.chart;
            if (!chartArea) return `rgba(${ir}, ${ig}, ${ib}, 0.85)`;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, `rgba(${ir}, ${ig}, ${ib}, 0.95)`);
            gradient.addColorStop(1, `rgba(${ir}, ${ig}, ${ib}, 0.65)`);
            return gradient;
          },
          hoverBackgroundColor: `rgba(${ir}, ${ig}, ${ib}, 1)`,
          borderRadius: 6,
          borderWidth: 0,
          yAxisID: 'y',
        },
        {
          label: 'NC Opened',
          data: ncOpenedData,
          backgroundColor: (context: ScriptableContext<'bar'>) => {
            const { ctx, chartArea } = context.chart;
            if (!chartArea) return `rgba(${nr}, ${ng}, ${nb}, 0.85)`;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, `rgba(${nr}, ${ng}, ${nb}, 0.95)`);
            gradient.addColorStop(1, `rgba(${nr}, ${ng}, ${nb}, 0.65)`);
            return gradient;
          },
          hoverBackgroundColor: `rgba(${nr}, ${ng}, ${nb}, 1)`,
          borderRadius: 6,
          borderWidth: 0,
          yAxisID: 'y',
        },
        {
          type: 'line' as const,
          label: 'NC Rate (%)',
          data: rateData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#6366f1',
          fill: false,
          yAxisID: 'rateAxis',
        },
      ],
    };
  });

  protected readonly chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    datasets: {
      bar: {
        barPercentage: 0.72,
        categoryPercentage: 0.8,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          title: (items) => items[0]?.label ?? '',
          label: (item) => ` ${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: { border: { display: false }, grid: { display: false }, ticks: { display: false } },
      y: {
        border: { display: false },
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.04)', drawTicks: false },
        ticks: {
          precision: 0,
          maxTicksLimit: 5,
          color: '#94a3b8',
          font: { size: 11 },
          padding: 8,
        },
      },
      rateAxis: {
        type: 'linear',
        position: 'right',
        border: { display: false },
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          precision: 1,
          maxTicksLimit: 5,
          color: '#6366f1',
          font: { size: 11 },
          padding: 8,
          callback: (value) => `${value}%`,
        },
      },
    },
  };

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
