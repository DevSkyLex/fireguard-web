import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { InspectionStatusTag } from '../../components/inspection-status-tag';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/**
 * Component InspectionTable
 * @class InspectionTable
 *
 * @description
 * The inspection grid: `hlmTable` inside a bordered, scrollable shell, one
 * row per inspection, no per-row menu — every property is edited on the
 * detail record, not the list (`FEATURE.md` "The record is the edit
 * surface"), so the only interactive element per row is the date cell's
 * link to that record. The row shows no equipment column: `InspectionOutput`
 * carries only a bare `equipmentId`, and a raw id is worse than omitting the
 * column — the detail record links to the equipment's own name instead.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate; this
 * component only renders the page it is handed.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-table',
  imports: [RouterLink, InspectionStatusTag, HlmSkeleton, ...HlmTableImports],
  templateUrl: './inspection-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InspectionOutput[]>}
   */
  public readonly items: InputSignal<readonly InspectionOutput[]> =
    input.required<readonly InspectionOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder rows instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property detailRouteBase
   * @readonly
   * @description Path segments the row link appends the inspection id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.1.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 5;
  }
  //#endregion
}
