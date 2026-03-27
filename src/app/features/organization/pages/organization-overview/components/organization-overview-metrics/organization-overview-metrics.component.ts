import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import type { Tag } from 'primeng/tag';
import { TagModule } from 'primeng/tag';

/**
 * Interface OrganizationOverviewHeadlineMetric
 *
 * @description
 * Local KPI view-model rendered by the overview metrics strip.
 */
interface OrganizationOverviewHeadlineMetric {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly badgeLabel: string;
  readonly badgeSeverity: NonNullable<Tag['severity']>;
}

/**
 * Component OrganizationOverviewMetricsComponent
 * @class OrganizationOverviewMetricsComponent
 *
 * @description
 * Smart KPI strip for the organization overview page.
 * It derives its own headline cards from raw overview statistics
 * while the page container keeps only orchestration concerns.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-metrics',
  host: {
    style: 'display: contents',
  },
  imports: [
    CardModule,
    SkeletonModule,
    TagModule,
  ],
  templateUrl: './organization-overview-metrics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewMetricsComponent {
  //#region Inputs
  /**
   * Input overviewStatistics
   * @readonly
   *
   * @description
   * Overview statistics used to derive facility-related KPIs.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationStatisticsOutput | null>}
   */
  public readonly overviewStatistics: InputSignal<OrganizationStatisticsOutput | null> =
    input<OrganizationStatisticsOutput | null>(null);

  /**
   * Input equipmentStatistics
   * @readonly
   *
   * @description
   * Equipment statistics used to derive asset-related KPIs.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationEquipmentStatisticsOutput | null>}
   */
  public readonly equipmentStatistics: InputSignal<OrganizationEquipmentStatisticsOutput | null> =
    input<OrganizationEquipmentStatisticsOutput | null>(null);

  /**
   * Input inspectionStatistics
   * @readonly
   *
   * @description
   * Inspection statistics used to derive activity-related KPIs.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationInspectionStatisticsOutput | null>}
   */
  public readonly inspectionStatistics: InputSignal<OrganizationInspectionStatisticsOutput | null> =
    input<OrganizationInspectionStatisticsOutput | null>(null);

  /**
   * Input showSkeleton
   * @readonly
   *
   * @description
   * Whether skeleton placeholders should be rendered instead of
   * the actual metric cards.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showSkeleton: InputSignal<boolean> =
    input<boolean>(false);
  //#endregion

  //#region ViewModel
  /**
   * Property metrics
   * @readonly
   *
   * @description
   * Headline KPI cards derived locally from the statistics inputs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationOverviewHeadlineMetric[]>}
   */
  protected readonly metrics: Signal<readonly OrganizationOverviewHeadlineMetric[]> =
    computed<readonly OrganizationOverviewHeadlineMetric[]>(() => {
      const overview: OrganizationStatisticsOutput | null = this.overviewStatistics();
      const equipment: OrganizationEquipmentStatisticsOutput | null =
        this.equipmentStatistics();
      const inspections: OrganizationInspectionStatisticsOutput | null =
        this.inspectionStatistics();

      const activeFacilityCount: number = overview?.activeFacilityCount ?? 0;
      const facilityCount: number = overview?.facilityCount ?? 0;
      const operationalEquipmentCount: number = equipment?.operationalCount ?? 0;
      const totalEquipmentCount: number = equipment?.totalCount ?? 0;

      return [
        {
          label: 'Active footprint',
          value: `${activeFacilityCount}`,
          helper: `${facilityCount} mapped facilities`,
          badgeLabel: `${facilityCount > 0 ? Math.round((activeFacilityCount / facilityCount) * 100) : 0}% online`,
          badgeSeverity: 'success',
        },
        {
          label: 'Operational assets',
          value: `${operationalEquipmentCount}`,
          helper: `${equipment?.underMaintenanceCount ?? 0} under maintenance`,
          badgeLabel: `${totalEquipmentCount > 0 ? Math.round((operationalEquipmentCount / totalEquipmentCount) * 100) : 0}% ready`,
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
  //#endregion
}
