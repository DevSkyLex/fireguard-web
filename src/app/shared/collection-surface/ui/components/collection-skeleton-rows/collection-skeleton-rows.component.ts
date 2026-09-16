import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTd, HlmTr } from '@shared/ui/table';

/** The width class repeated for a column when only {@link CollectionSkeletonRows.columnCount} is given. */
const DEFAULT_COLUMN_WIDTH: string = 'w-24';

/**
 * Component CollectionSkeletonRows
 * @class CollectionSkeletonRows
 *
 * @description
 * Placeholder `<tr>` rows for a table's first load, using the project's
 * loading-state vocabulary. Renders `<tr hlmTableRow aria-hidden="true">`
 * with an `hlm-skeleton` bar per column — nothing else. Its host uses
 * `display: contents` so those rows remain in the parent table's formatting
 * context and share the header's column geometry. It deliberately does **not**
 * render the `role="status"` announcement itself: wrapping `<tr>` elements in
 * a status container is invalid table markup, so that announcement is
 * {@link CollectionSurface}'s business, rendered as its sibling.
 *
 * A column's width is either taken literally from {@link columns} (one
 * Tailwind width class per column, e.g. `['w-14', 'w-56', 'w-24']`) or, when
 * that is empty, derived by repeating a generic width {@link columnCount}
 * times — the caller does not have to enumerate widths just to get the
 * right number of cells.
 *
 * `CollectionSurface` renders it in place of the projected `[surfaceRows]`
 * content during a first load. A page-owned table may also place it directly
 * in its own `<tbody>` when the table cannot be expressed through a
 * `CollectionSurface`; the caller remains responsible for the table head and
 * request state announcement.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-collection-skeleton-rows [rows]="5" [columns]="['w-14', 'w-56', 'w-24']" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-skeleton-rows',
  imports: [HlmSkeleton, HlmTr, HlmTd],
  host: { class: 'contents' },
  templateUrl: './collection-skeleton-rows.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionSkeletonRows {
  //#region Inputs
  /**
   * Property rows
   * @readonly
   *
   * @description
   * How many placeholder rows to draw. Defaults to `5`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly rows: InputSignal<number> = input<number>(5);

  /**
   * Property columns
   * @readonly
   *
   * @description
   * One literal Tailwind width class per column, e.g.
   * `['w-14', 'w-56', 'w-24']`. Takes precedence over {@link columnCount}
   * when non-empty. Each skeleton bar also carries a fixed `h-4`, applied by
   * this component rather than asked of the caller.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly columns: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property columnCount
   * @readonly
   *
   * @description
   * How many cells a row has, used only when {@link columns} is empty — each
   * cell then draws a generic width rather than a caller-tuned one.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly columnCount: InputSignal<number> = input<number>(0);
  //#endregion

  //#region Properties
  /**
   * Property rowIndexes
   * @readonly
   *
   * @description
   * {@link rows} materialized into a trackable array for `@for`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly number[]>}
   */
  protected readonly rowIndexes: Signal<readonly number[]> = computed<readonly number[]>(() =>
    Array.from({ length: this.rows() }, (_value: unknown, index: number): number => index),
  );

  /**
   * Property effectiveColumns
   * @readonly
   *
   * @description
   * The width class each skeleton cell draws: {@link columns} verbatim when
   * given, otherwise {@link columnCount} repetitions of
   * {@link DEFAULT_COLUMN_WIDTH}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly effectiveColumns: Signal<readonly string[]> = computed<readonly string[]>(
    () => {
      const explicit: readonly string[] = this.columns();

      if (explicit.length > 0) return explicit;

      return Array.from({ length: this.columnCount() }, (): string => DEFAULT_COLUMN_WIDTH);
    },
  );
  //#endregion
}
