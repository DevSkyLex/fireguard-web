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
  OrganizationFacilityStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
} from '@core/models/organization';
import { CardModule } from 'primeng/card';
import type { Tag } from 'primeng/tag';
import { TagModule } from 'primeng/tag';

/**
 * Interface OrganizationOverviewBreakdownItem
 *
 * @description
 * Local normalized breakdown item derived from count maps.
 */
interface OrganizationOverviewBreakdownItem {
  readonly label: string;
  readonly value: number;
}

/**
 * Interface OrganizationOverviewFocusBoardItem
 *
 * @description
 * Local insight item rendered by the focus board.
 */
interface OrganizationOverviewFocusBoardItem {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly severity: NonNullable<Tag['severity']>;
}

/**
 * Function toSortedBreakdown
 *
 * @description
 * Normalizes a statistics count map into sorted human-readable items.
 *
 * @param counts Optional count map from the API statistics payload.
 *
 * @returns Sorted breakdown items, highest value first.
 */
function toSortedBreakdown(
  counts: Readonly<Record<string, number>> | null | undefined,
): readonly OrganizationOverviewBreakdownItem[] {
  return Object.entries(counts ?? {})
    .map(([label, value]: [string, number]) => ({
      label: label
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      value,
    }))
    .sort(
      (
        left: OrganizationOverviewBreakdownItem,
        right: OrganizationOverviewBreakdownItem,
      ) => right.value - left.value,
    );
}

/**
 * Component OrganizationOverviewFocusBoardComponent
 * @class OrganizationOverviewFocusBoardComponent
 *
 * @description
 * Smart insight card rendering notable overview highlights derived
 * from raw organization statistics.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-focus-board',
  host: {
    style: 'display: block',
  },
  imports: [
    CardModule,
    TagModule,
  ],
  templateUrl: './organization-overview-focus-board.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewFocusBoardComponent {
  //#region Inputs
  /**
   * Input equipmentStatistics
   * @readonly
   *
   * @description
   * Equipment statistics used to derive top equipment insights.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationEquipmentStatisticsOutput | null>}
   */
  public readonly equipmentStatistics: InputSignal<OrganizationEquipmentStatisticsOutput | null> =
    input<OrganizationEquipmentStatisticsOutput | null>(null);

  /**
   * Input facilityStatistics
   * @readonly
   *
   * @description
   * Facility statistics used to derive facility mix insights.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationFacilityStatisticsOutput | null>}
   */
  public readonly facilityStatistics: InputSignal<OrganizationFacilityStatisticsOutput | null> =
    input<OrganizationFacilityStatisticsOutput | null>(null);

  /**
   * Input inspectionStatistics
   * @readonly
   *
   * @description
   * Inspection statistics used to derive pass-rate insights.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationInspectionStatisticsOutput | null>}
   */
  public readonly inspectionStatistics: InputSignal<OrganizationInspectionStatisticsOutput | null> =
    input<OrganizationInspectionStatisticsOutput | null>(null);

  /**
   * Input membershipStatistics
   * @readonly
   *
   * @description
   * Membership statistics used to derive invitation insights.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationMembershipStatisticsOutput | null>}
   */
  public readonly membershipStatistics: InputSignal<OrganizationMembershipStatisticsOutput | null> =
    input<OrganizationMembershipStatisticsOutput | null>(null);

  /**
   * Input nonConformityStatistics
   * @readonly
   *
   * @description
   * Non-conformity statistics used to derive pending attention insights.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationNonConformityStatisticsOutput | null>}
   */
  public readonly nonConformityStatistics: InputSignal<OrganizationNonConformityStatisticsOutput | null> =
    input<OrganizationNonConformityStatisticsOutput | null>(null);
  //#endregion

  //#region ViewModel
  /**
   * Property items
   * @readonly
   *
   * @description
   * Overview insight items derived locally from the provided statistics.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationOverviewFocusBoardItem[]>}
   */
  protected readonly items: Signal<readonly OrganizationOverviewFocusBoardItem[]> =
    computed<readonly OrganizationOverviewFocusBoardItem[]>(() => {
      const topEquipment: OrganizationOverviewBreakdownItem | undefined =
        toSortedBreakdown(this.equipmentStatistics()?.countsByType)[0];
      const topFacility: OrganizationOverviewBreakdownItem | undefined =
        toSortedBreakdown(this.facilityStatistics()?.countsByType)[0];
      const topInspector: OrganizationOverviewBreakdownItem | undefined =
        toSortedBreakdown(this.inspectionStatistics()?.countsByInspectorType)[0];

      const inspections: OrganizationInspectionStatisticsOutput | null =
        this.inspectionStatistics();
      const membership: OrganizationMembershipStatisticsOutput | null =
        this.membershipStatistics();
      const nonConformities: OrganizationNonConformityStatisticsOutput | null =
        this.nonConformityStatistics();

      const passCount: number = inspections?.passCount ?? 0;
      const inspectionCount: number = inspections?.totalCount ?? 0;

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
          value: `${inspectionCount > 0 ? Math.round((passCount / inspectionCount) * 100) : 0}%`,
          helper: topInspector
            ? `Mostly handled by ${topInspector.label}`
            : 'No inspector mix available yet',
          severity: 'contrast',
        },
        {
          label: 'Pending invitations',
          value: `${membership?.pendingInvitationCount ?? 0}`,
          helper: `${(nonConformities?.openCount ?? 0) + (nonConformities?.inProgressCount ?? 0)} findings still need attention`,
          severity: 'warn',
        },
      ] as const;
    });
  //#endregion
}
