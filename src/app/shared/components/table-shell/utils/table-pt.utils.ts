import type { TablePassThroughOptions } from 'primeng/table';

/**
 * Function tablePt
 *
 * @description
 * Builds the PrimeNG `p-table` pass-through classes shared by every entity
 * table in the app: a compact `text-sm` body and, for tables that stretch to
 * fill a {@link TableShell} `variant="fill"` shell (`fill: true`, the
 * default), a full-height table container with a right-aligned paginator
 * that hides itself once the current page has zero rows. Bind the result
 * directly on the native `<p-table [pt]>` input — this function never
 * touches the table itself, it only returns pass-through classes.
 *
 * The bottom rounding is deliberately owned by the outer `p-card` alone (its
 * `overflow-hidden` clips everything inside to its own radius) — the table
 * container and paginator stay flat rectangles. Rounding the table container
 * and the paginator independently, on top of the card's own corner, produced
 * a visible clipping seam right where a short result set's last row met the
 * blank fill space above the paginator.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {object} [options] Table layout options.
 * @param {boolean} [options.empty] Whether the current page has zero rows.
 * When `true`, the paginator root gets a `hidden` class appended — for both
 * the `fill` branch's own paginator and, when a `variant="card"` table still
 * binds `[paginator]="true"` on itself (rather than rendering a fully
 * external `p-paginator`), its own internal paginator too.
 * @param {boolean} [options.fill=true] Whether the table stretches to fill a
 * `variant="fill"` {@link TableShell}. Pass `false` for a `variant="card"`
 * shell that renders its own external `p-paginator` below the table — that
 * paginator often doesn't render at all when the page fits in one screen, so
 * the last row's own bottom border sits directly against the card's border,
 * reading as a double line; this branch zeroes it.
 * @param {boolean} [options.scroll=false] Whether the table is a full-width,
 * horizontally scrollable card table with its own bottom-rounded, right-aligned
 * paginator (the intervention field-work / work-item tables). Takes precedence
 * over `fill`; combine with `empty` to hide the paginator on an empty page.
 *
 * @returns {TablePassThroughOptions} Pass-through classes to bind on the
 * native `<p-table [pt]>` input.
 */
export function tablePt(options?: {
  empty?: boolean;
  fill?: boolean;
  scroll?: boolean;
}): TablePassThroughOptions {
  const fill: boolean = options?.fill ?? true;
  const base: TablePassThroughOptions = {
    table: { class: 'text-sm' },
  };
  const paginatorHidden: string = options?.empty ? ' hidden' : '';

  if (options?.scroll) {
    return {
      root: { class: 'w-full' },
      table: { class: 'w-full text-sm' },
      tableContainer: { class: 'overflow-x-auto' },
      pcPaginator: {
        root: {
          class: 'justify-end rounded-b-xl bg-surface-0 dark:bg-surface-950' + paginatorHidden,
        },
      },
    };
  }

  if (!fill) {
    return {
      ...base,
      tbody: { class: '[&>tr:last-child>td]:border-b-0' },
      ...(options?.empty ? { pcPaginator: { root: { class: 'hidden' } } } : {}),
    };
  }

  return {
    ...base,
    root: { class: 'flex min-h-0 flex-1 flex-col' },
    tableContainer: { class: 'min-h-0 flex-1 overflow-hidden' },
    header: { class: 'border-0 bg-surface-0 p-0 dark:bg-surface-950' },
    pcPaginator: {
      root: {
        class: 'mt-auto justify-end bg-surface-0 dark:bg-surface-950' + paginatorHidden,
      },
    },
  };
}
