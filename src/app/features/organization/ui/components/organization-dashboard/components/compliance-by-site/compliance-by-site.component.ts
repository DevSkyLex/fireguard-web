import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { ComplianceFacilityRow } from '@features/organization/features/compliance/models';
import { EmptyState, ErrorState, Skeleton, TrendCard } from '@shared/components';

/**
 * Component ComplianceBySite
 * @class ComplianceBySite
 *
 * @description
 * Presentational dashboard card showing the five worst **measured** sites by
 * maintenance coverage, each with its rate bar, percentage and tracked-equipment
 * denominator. Unmeasured sites (`complianceRate === null`) are never listed as
 * 0% — they are excluded from the top five and summed into a "not yet measured"
 * line instead. Emits `viewCompliance` for the parent to open the register and
 * `retry` from the error state.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-compliance-by-site
 *   [rows]="complianceStore.facilities()"
 *   [loading]="complianceStore.isQueryLoading()"
 *   [hasError]="complianceStore.queryHasError()"
 *   (viewCompliance)="openCompliance()"
 *   (retry)="retryCompliance()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-compliance-by-site',
  templateUrl: './compliance-by-site.component.html',
  imports: [ButtonModule, EmptyState, ErrorState, Skeleton, TrendCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceBySite {
  //#region Inputs

  /**
   * Property rows
   * @readonly
   *
   * @description
   * The per-site compliance breakdown, as published by the compliance
   * feature's summary store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ComplianceFacilityRow[]>}
   */
  public readonly rows: InputSignal<readonly ComplianceFacilityRow[]> = input<
    readonly ComplianceFacilityRow[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Swaps the site list for skeleton placeholders while the summary query
   * is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * Replaces the site list with a retryable error state when the summary
   * query failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);

  //#endregion

  //#region Outputs

  /**
   * Property viewCompliance
   * @readonly
   *
   * @description
   * Emits when the user asks to open the full compliance register, for the
   * parent to route there.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly viewCompliance: OutputEmitterRef<void> = output<void>();

  /**
   * Property retry
   * @readonly
   *
   * @description
   * Emits when the user asks to reload after a failed summary query.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retry: OutputEmitterRef<void> = output<void>();

  //#endregion

  //#region Properties

  /**
   * Property topSites
   * @readonly
   *
   * @description
   * The five worst **measured** sites, worst coverage first. Unmeasured
   * sites are excluded rather than sorted as 0% — they are counted by
   * {@link unmeasuredCount} instead.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ComplianceFacilityRow[]>}
   */
  protected readonly topSites: Signal<readonly ComplianceFacilityRow[]> = computed(
    (): readonly ComplianceFacilityRow[] =>
      this.rows()
        .filter((row: ComplianceFacilityRow): boolean => row.complianceRate !== null)
        .toSorted(
          (left: ComplianceFacilityRow, right: ComplianceFacilityRow): number =>
            (left.complianceRate ?? 0) - (right.complianceRate ?? 0),
        )
        .slice(0, 5),
  );

  /**
   * Property unmeasuredCount
   * @readonly
   *
   * @description
   * Sites tracking no scheduled equipment (`complianceRate === null`). They
   * are unmeasured, not failing, so they surface as a count rather than as
   * 0% rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly unmeasuredCount: Signal<number> = computed(
    (): number =>
      this.rows().filter((row: ComplianceFacilityRow): boolean => row.complianceRate === null)
        .length,
  );

  //#endregion

  //#region Methods

  /**
   * Method rateLabel
   *
   * @description
   * Formats a site's coverage, or an em dash when it tracks nothing — the
   * backend returns `null` there, and it must not read as 0%.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number | null} rate - The compliance percentage.
   * @returns {string} The label to render.
   */
  protected rateLabel(rate: number | null): string {
    return rate === null ? '—' : `${Math.round(rate)}%`;
  }

  /**
   * Method rateTextClass
   *
   * @description
   * Colour band for a coverage rate, always paired with the number itself.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number | null} rate - The compliance percentage.
   * @returns {string} The text colour class.
   */
  protected rateTextClass(rate: number | null): string {
    if (rate === null) return 'text-surface-400 dark:text-surface-500';
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  /**
   * Method rateBarClass
   *
   * @description
   * Background class for a coverage bar, matching the text colour band.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number | null} rate - The compliance percentage.
   * @returns {string} The bar background class.
   */
  protected rateBarClass(rate: number | null): string {
    if (rate === null) return 'bg-surface-300 dark:bg-surface-600';
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  }

  //#endregion
}
