import { DatePipe } from '@angular/common';
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
import { TableModule } from 'primeng/table';
import type { ComplianceFacilityRow } from '@features/organization/features/compliance/models';
import { EmptyState } from '@shared/components';

/**
 * Component ComplianceFacilityTable
 * @class ComplianceFacilityTable
 *
 * @description
 * The per-site compliance breakdown: coverage rate, equipment split by
 * maintenance state, open critical non-conformities, and last inspection.
 *
 * Presentational — the register arrives already sorted by the store.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-compliance-facility-table [rows]="store.facilities()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-compliance-facility-table',
  imports: [TableModule, DatePipe, EmptyState],
  templateUrl: './compliance-facility-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceFacilityTable {
  //#region Inputs
  /**
   * Property rows
   * @readonly
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
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property view
   * @readonly
   *
   * @description
   * Emits the site whose row was activated. The table stays presentational —
   * the page owns where "open this site" leads (ARCHITECTURE §9.3).
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<ComplianceFacilityRow>}
   */
  public readonly view: OutputEmitterRef<ComplianceFacilityRow> = output<ComplianceFacilityRow>();
  //#endregion

  //#region Properties
  /**
   * Property mutableRows
   * @readonly
   *
   * @description
   * A mutable copy for `p-table`, whose `value` input is not readonly.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ComplianceFacilityRow[]>}
   */
  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Rows per page. Ten keeps the card the same height as the compliance
   * summary beside it, which is what stops the tab reflowing when a site is
   * added.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {number}
   */
  protected readonly pageSize: number = 10;

  protected readonly mutableRows: Signal<ComplianceFacilityRow[]> = computed(() => [
    ...this.rows(),
  ]);
  //#endregion

  //#region Methods
  /**
   * Method coverageLabel
   *
   * @description
   * Formats a site's coverage, or an em dash when it tracks nothing — the
   * backend returns `null` there, and it must not read as 0%.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number | null} rate - The compliance percentage.
   *
   * @returns {string} The label to render.
   */
  protected coverageLabel(rate: number | null): string {
    return rate === null ? '—' : `${Math.round(rate)}%`;
  }

  /**
   * Method coverageClass
   *
   * @description
   * Colour band for a coverage rate, always paired with the number itself.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number | null} rate - The compliance percentage.
   *
   * @returns {string} The text colour class.
   */
  protected coverageClass(rate: number | null): string {
    if (rate === null) return 'text-surface-400 dark:text-surface-500';
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }
  //#endregion
}
