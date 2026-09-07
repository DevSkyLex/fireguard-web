import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import {
  resolveInspectionStatusTag,
  type NonConformityStatus,
} from '@features/organization/features/inspections/models';
import type { OrganizationDashboardOverview } from '@features/organization/models';
import { getOrganizationDashboardOverviewMetricValue } from '@features/organization/utils';
import { DonutChart, type ChartSegment, type ChartColorToken } from '@shared/chart';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component OrganizationDashboardRisk
 * @class OrganizationDashboardRisk
 * @description Read-only current status distribution. Missing status counts remain unavailable instead of claiming a healthy zero.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-risk',
  imports: [DonutChart, DecimalPipe, HlmSkeleton, ...HlmEmptyImports, ...HlmCardImports],
  templateUrl: './organization-dashboard-risk.component.html',
  host: { class: 'block min-w-0 h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardRisk {
  /**
   * Property overview
   * @readonly
   * @description Aggregate snapshot supplied by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationDashboardOverview | null>}
   */
  public readonly overview: InputSignal<OrganizationDashboardOverview | null> =
    input.required<OrganizationDashboardOverview | null>();

  /**
   * Property loading
   * @readonly
   * @description First-load skeleton state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);

  /**
   * Property segments
   * @readonly
   * @description Complete status counts sharing the same denominator.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly ChartSegment[] | null>}
   */
  protected readonly segments: Signal<readonly ChartSegment[] | null> = computed(() => {
    const statuses: readonly {
      status: NonConformityStatus;
      key: string;
      color: ChartColorToken;
    }[] = [
      { status: 'open', key: 'open', color: 'warning' },
      { status: 'in_progress', key: 'inProgress', color: 'info' },
      { status: 'done', key: 'done', color: 'success' },
      { status: 'waived', key: 'waived', color: 'muted-foreground' },
    ];
    const data = statuses.map((entry) => ({
      id: entry.status,
      label: resolveInspectionStatusTag('nonConformityStatus', entry.status).label,
      value: getOrganizationDashboardOverviewMetricValue(
        this.overview() ?? undefined,
        'nonConformities',
        entry.key,
      ),
      colorToken: entry.color,
    }));
    if (
      data.some(
        (entry) => entry.value === null || !Number.isFinite(entry.value) || Number(entry.value) < 0,
      )
    )
      return null;
    return data.map((entry) => ({
      id: entry.id,
      label: entry.label,
      colorToken: entry.colorToken,
      value: Number(entry.value),
    }));
  });

  /**
   * Property total
   * @readonly
   * @description Denominator used by the visible percentage legend.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly total: Signal<number> = computed(
    () => this.segments()?.reduce((sum, segment) => sum + segment.value, 0) ?? 0,
  );
}
