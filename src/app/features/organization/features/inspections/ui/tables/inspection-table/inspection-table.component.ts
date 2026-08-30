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
import { lucideArrowDown, lucideArrowUp, lucideChevronsUpDown } from '@ng-icons/lucide';
import type {
  InspectionListSort,
  InspectionOutput,
  InspectionSortField,
} from '@features/organization/features/inspections/models';
import { CollectionSurface } from '@shared/collection-surface';
import { HlmButton } from '@shared/ui/button';
import { HlmTableImports } from '@shared/ui/table';
import { InspectionStatusTag } from '../../components/inspection-status-tag';

/**
 * Component InspectionTable
 * @class InspectionTable
 *
 * @description
 * The inspection grid: `hlmTable` inside the shared collection surface, one
 * row per inspection, no per-row menu — every property is edited on the
 * detail record, not the list (`FEATURE.md` "The record is the edit
 * surface"), so the only interactive element per row is the date cell's
 * link to that record. The row shows no equipment column: `InspectionOutput`
 * carries only a bare `equipmentId`, and a raw id is worse than omitting the
 * column — the detail record links to the equipment's own name instead.
 *
 * "Performed on", "Result" and "Status" are sortable heads, the same ghost-
 * button-with-glyph pattern `InterventionTable` uses — the backend's own
 * whitelist (`result`, `status`, `performedAt`, `createdAt`) also allows
 * `createdAt`, but this table renders no column for it, so no head offers it.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter, sort and paginate;
 * this component only renders the page it is handed and emits
 * {@link sortChanged} when a head is activated. The bordered, scrollable
 * shell, the first-load skeleton and the below-`2xl` card fallback all come
 * from the shared `CollectionSurface`.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-table',
  imports: [
    RouterLink,
    NgIcon,
    CollectionSurface,
    HlmButton,
    InspectionStatusTag,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideArrowDown, lucideArrowUp, lucideChevronsUpDown })],
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

  /**
   * Property sortOrder
   * @readonly
   *
   * @description
   * The active ordering, deciding what each sortable head announces and
   * which direction glyph it shows.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<InspectionListSort>}
   */
  public readonly sortOrder: InputSignal<InspectionListSort> = input.required<InspectionListSort>();
  //#endregion

  //#region Outputs
  /**
   * Property sortChanged
   * @readonly
   *
   * @description
   * A sortable head was activated; carries the field. Re-emitting the active
   * field means "reverse it" — the page owns the direction.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<InspectionSortField>}
   */
  public readonly sortChanged: OutputEmitterRef<InspectionSortField> =
    output<InspectionSortField>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumnWidths
   * @readonly
   *
   * @description
   * One literal Tailwind width per rendered column, handed to the shared
   * surface's skeleton rows. Literal strings because Tailwind scans source
   * text, and column-aware because a skeleton whose blocks do not line up
   * with the header it replaces reads as a broken table rather than a
   * loading one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly skeletonColumnWidths: readonly string[] = [
    'w-24',
    'w-32',
    'w-20',
    'w-20',
    'w-8',
  ];
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

  /**
   * Method ariaSort
   * @method ariaSort
   *
   * @description
   * What a sortable head announces for the active ordering.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {InspectionSortField} field - The head's field.
   *
   * @returns {'ascending' | 'descending' | 'none'} The `aria-sort` value.
   */
  protected ariaSort(field: InspectionSortField): 'ascending' | 'descending' | 'none' {
    const active: InspectionListSort = this.sortOrder();

    if (active.field !== field) return 'none';

    return active.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @method sortIcon
   *
   * @description
   * The glyph a sortable head shows: a direction when it is the active one, a
   * neutral pair otherwise.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {InspectionSortField} field - The head's field.
   *
   * @returns {string} A registered lucide name.
   */
  protected sortIcon(field: InspectionSortField): string {
    const active: InspectionListSort = this.sortOrder();

    if (active.field !== field) return 'lucideChevronsUpDown';

    return active.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }
  //#endregion
}
