import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArchive,
  lucideArchiveRestore,
  lucideEllipsis,
  lucideNetwork,
  lucideSquareArrowOutUpRight,
} from '@ng-icons/lucide';
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { FacilityStatusTag } from '../../components/facility-status-tag';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/**
 * Component FacilityTable
 * @class FacilityTable
 *
 * @description
 * The root-facility list view: `hlmTable` inside a bordered, scrollable
 * shell, one row per facility, and a trailing `…` menu offering the row
 * actions this list still owns — Archive and Restore — since the record
 * itself is where every other property is edited (`FEATURE.md` "The record
 * is the edit surface").
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate; a menu
 * choice only asks for the write through an `output()`.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-table',
  imports: [
    RouterLink,
    NgIcon,
    FacilityStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({
      lucideArchive,
      lucideArchiveRestore,
      lucideEllipsis,
      lucideNetwork,
      lucideSquareArrowOutUpRight,
    }),
  ],
  templateUrl: './facility-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly items: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

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
   * Property canWrite
   * @readonly
   * @description Whether the row menu may offer Archive/Restore. False hides both rather than showing controls that would be refused.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property detailRouteBase
   * @readonly
   * @description Path segments the row link appends the facility id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();
  //#endregion

  //#region Outputs
  /**
   * Property archiveRequested
   * @readonly
   * @description A row menu asked for the facility to be archived. The table never archives: the page confirms and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly archiveRequested: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Property restoreRequested
   * @readonly
   * @description A row menu asked for the facility to be restored.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly restoreRequested: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   * @description The facility's type, humanized through the shared type catalog.
   * @access protected
   * @since 1.0.0
   * @param {string} type - The raw type value.
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected typeLabelOf(type: string): string {
    return (
      FACILITY_TYPE_OPTIONS.find((option) => option.value === (type as FacilityType))?.label ??
      type.replace(/_/g, ' ')
    );
  }

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
