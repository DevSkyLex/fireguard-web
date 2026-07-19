import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { NonConformitySeverityBucket } from '@features/organization/data-access/adapters/organization-dashboard-severity.adapter';
import {
  resolveInspectionTag,
  type InspectionTagDescriptor,
} from '@features/organization/features/inspections/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { TrendCard, tagSeverityDotClass } from '@shared/components';

/**
 * One severity row, ready to render.
 *
 * @since 1.0.0
 */
interface SeverityRow {
  readonly label: string;
  readonly count: number;
  readonly barClass: string;
  readonly share: number;
}

/**
 * Component NonConformitiesBySeverity
 * @class NonConformitiesBySeverity
 *
 * @description
 * Open non-conformities as a horizontal bar per severity, worst first, with
 * the open total in the card's metric slot.
 *
 * Labels, colours and ordering come from the inspection tag registry rather
 * than from branches here — the registry is the single place that decides how
 * a severity looks (ARCHITECTURE §9.6).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-non-conformities-by-severity />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-by-severity',
  imports: [TrendCard],
  templateUrl: './non-conformities-by-severity.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesBySeverity {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DashboardStore}
   */
  private readonly store: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property isLoading
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed((): boolean =>
    this.store.isQueryLoading(),
  );

  /**
   * Property total
   * @readonly
   *
   * @description
   * Open non-conformities across every severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly total: Signal<number> = computed((): number =>
    this.store
      .nonConformitiesBySeverity()
      .reduce((sum: number, bucket: NonConformitySeverityBucket): number => sum + bucket.count, 0),
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * One row per severity. `share` is relative to the **largest** bucket, not
   * to the total: the bars compare severities against each other, and scaling
   * to the total would flatten every bar into invisibility whenever one
   * severity dominates.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SeverityRow[]>}
   */
  protected readonly rows: Signal<readonly SeverityRow[]> = computed((): readonly SeverityRow[] => {
    const buckets: readonly NonConformitySeverityBucket[] = this.store.nonConformitiesBySeverity();
    const largest: number = Math.max(
      ...buckets.map((bucket: NonConformitySeverityBucket): number => bucket.count),
      0,
    );

    return buckets.map((bucket: NonConformitySeverityBucket): SeverityRow => {
      const descriptor: InspectionTagDescriptor = resolveInspectionTag(
        'nonConformitySeverity',
        bucket.severity,
      );

      return {
        label: descriptor.label,
        count: bucket.count,
        barClass: tagSeverityDotClass(descriptor.severity),
        share: largest > 0 ? (bucket.count / largest) * 100 : 0,
      };
    });
  });
  //#endregion
}
