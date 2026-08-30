import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  CollectionSurfaceBreakpoint,
  CollectionSurfaceDensity,
} from '@shared/collection-surface/models';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmCaption, HlmTable, HlmTableContainer, HlmTBody, HlmTHead } from '@shared/ui/table';
import { CollectionSkeletonRows } from '../collection-skeleton-rows';

/** Which region the template shows once the first-load skeleton no longer applies. */
type CollectionSurfaceSlot = 'error' | 'empty' | 'surface';

/**
 * Component CollectionSurface
 * @class CollectionSurface
 *
 * @description
 * The bordered, scrollable table shell every collection table in the
 * application re-implements by hand today — extracted per `DESIGN.md`
 * "Tables: `hlmTable` inside `hlmTableContainer`" and the audit behind this
 * change (40 files reference `hlmTable` outside vendored code; the 5
 * intervention sub-tables are missing `role="region"`/`tabindex="0"`/
 * `aria-labelledby` on their scroll container; 12 of 17 render skeleton rows
 * with no `role="status"` announcement; none give the table a card fallback
 * below its own container width). Presentational (`ARCHITECTURE.md`
 * §10.3) — it injects no store and calls no service.
 *
 * **The one loading contract this owns: "first load only."** {@link loading}
 * only draws the skeleton while {@link rowCount} is still `0`
 * (`isInitialLoading`, below) — a subsequent page fetch with rows already on
 * screen renders {@link rowCount}'s real content undisturbed, so a "load
 * more" affordance stays the caller's own concern (`intervention-equipment
 * -table`'s own busy button is the precedent this does not fold in).
 *
 * **Routing between states is this component's job, not the caller's.**
 * {@link hasError} beats {@link rowCount}, which beats a normal render:
 * loading first, then the `[surfaceError]` slot, then `[surfaceEmpty]`,
 * otherwise the table/card pair. A caller does not re-derive this ladder on
 * its own page seventeen times.
 *
 * **The sticky head sits on `hlmTableContainer` itself**
 * (`h-full overflow-y-auto`) — never split across a second wrapper —
 * because `overflow-x-auto` (which `HlmTableContainer` always carries)
 * forces `overflow-y` to compute as `auto` regardless of what is written, so
 * a second wrapper would pin the sticky head to the wrong, non-scrolling
 * ancestor (`interventions/FEATURE.md`'s own account of this trap).
 *
 * **The table/card switch is a container query, not a viewport one**
 * (`@container/surface`, {@link compactBreakpoint}), so a collapsed sidebar
 * does not force cards a wide-enough content column would not need.
 * Both layouts stay mounted; only a Tailwind `hidden`/`block` pair toggles,
 * because no directive here can react to a container query the way `@if`
 * reacts to a signal.
 *
 * **Column headers are pinned to the Label rung** (`text-xs`, `DESIGN.md`'s
 * type scale) here, not in the vendored `HlmTh`, which still renders the
 * inherited 14px body size — the fix lives at this level, once, rather than
 * as a class seventeen call sites would each have to repeat.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-collection-surface
 *   caption="The organization's interventions."
 *   testId="intervention-table"
 *   [loading]="loading()"
 *   [rowCount]="items().length"
 *   [columnCount]="8"
 *   [skeletonColumns]="['w-4', 'w-14', 'w-56', 'w-24', 'w-20']"
 * >
 *   <tr surfaceHead hlmTableRow>…</tr>
 *   @for (item of items(); track item.id) {
 *     <tr surfaceRows hlmTableRow>…</tr>
 *   }
 *   <div surfaceCards>…</div>
 *   <app-empty-state surfaceEmpty title="No interventions" />
 * </app-collection-surface>
 * ```
 *
 * The host is a flex column that takes its caller's height (`h-full`) instead
 * of sizing to its content. Both halves matter and one without the other does
 * nothing: `h-full` is what reaches the definite height a page table host gets
 * from `flex-1 min-h-0`, since that host is a `block` and a block child never
 * inherits a bound otherwise; the flex column is what lets the wrapper below
 * claim that height as `flex-1`. A caller that does not bound its own height
 * still gets content height, because `h-full` on an auto parent is auto.
 *
 * Before this the host was an auto-height block. The wrapper's `h-full`
 * resolved against `auto`, its `overflow-hidden` never clipped, and the table
 * grew past the bounded box of its parent — so the pager, correctly placed in
 * flow right after that box, was drawn across the middle of the rows.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-surface',
  imports: [
    HlmCaption,
    HlmTable,
    HlmTableContainer,
    HlmTBody,
    HlmTHead,
    HlmSkeleton,
    CollectionSkeletonRows,
  ],
  host: { class: '@container/surface flex h-full w-full min-h-0 flex-col' },
  templateUrl: './collection-surface.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionSurface {
  //#region Inputs
  /**
   * Property caption
   * @readonly
   *
   * @description
   * The table's own accessible name, rendered as a visually hidden
   * `<caption>` and referenced by the scroll region's `aria-labelledby`.
   * Already localized by the caller — this component owns no domain
   * vocabulary of its own.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly caption: InputSignal<string> = input.required<string>();

  /**
   * Property testId
   * @readonly
   *
   * @description
   * The owning table's `data-testid` prefix. Drives the `<table>` element's
   * own `data-testid`, the cards wrapper's (`<testId>-cards`), and the
   * caption id (`<testId>-caption`) the region points its
   * `aria-labelledby` at.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly testId: InputSignal<string> = input.required<string>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a fetch is in flight. Only draws the skeleton while
   * {@link rowCount} is still `0` — see {@link isInitialLoading}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * Whether the caller's most recent fetch failed. Takes priority over
   * {@link rowCount} in the routing ladder, so a failed refetch of an
   * already-populated table still surfaces the `[surfaceError]` slot.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property rowCount
   * @readonly
   *
   * @description
   * The current real row count — never the skeleton row count. Drives both
   * the first-load guard and the empty-state routing, so seventeen pages
   * stop re-deriving `loading() && items().length === 0` on their own.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly rowCount: InputSignal<number> = input.required<number>();

  /**
   * Property columnCount
   * @readonly
   *
   * @description
   * How many columns the caller's `[surfaceHead]` renders. Forwarded to
   * `CollectionSkeletonRows` as its own `columnCount` fallback, used only
   * when {@link skeletonColumns} is empty.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly columnCount: InputSignal<number> = input.required<number>();

  /**
   * Property skeletonColumns
   * @readonly
   *
   * @description
   * One literal Tailwind width class per column (e.g.
   * `['w-14', 'w-56', 'w-24']`), forwarded verbatim to
   * `CollectionSkeletonRows`. Left empty, the skeleton falls back to
   * {@link columnCount} generic-width cells.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly skeletonColumns: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property skeletonRowCount
   * @readonly
   *
   * @description
   * How many placeholder rows the first-load skeleton draws.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly skeletonRowCount: InputSignal<number> = input<number>(5);

  /**
   * Property maxHeight
   * @readonly
   *
   * @description
   * An optional literal Tailwind `max-h-*` class bounding the scroll container,
   * for a collection that lives inside a panel rather than owning the page —
   * a detail tab, a sheet. Without it the surface grows to its content and the
   * *page* scrolls, which is right for a collection page and wrong inside a
   * bounded panel. Literal, because Tailwind scans source text.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly maxHeight: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property skeletonRowIndexes
   * @readonly
   *
   * @description
   * Track keys for the placeholder rows, so the card layout can draw as many
   * placeholders as the table does. Without them the compact layout rendered
   * nothing at all during a first load — a blank panel where the table shows
   * skeletons, which reads as an empty collection rather than a loading one.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly number[]>}
   */
  protected readonly skeletonRowIndexes: Signal<readonly number[]> = computed<readonly number[]>(
    () => Array.from({ length: this.skeletonRowCount() }, (_, index: number) => index),
  );

  /**
   * Property density
   * @readonly
   *
   * @description
   * The head/row rhythm — `'comfortable'` (default, 44px head, ≥44px rows)
   * or `'compact'` (36px head). Applied through a descendant selector
   * targeting the caller's own `[data-slot=table-head]`/`[data-slot=table
   * -cell]` cells, since those cells belong to the projected
   * `[surfaceHead]`/`[surfaceRows]` content, not to this component's own
   * template.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CollectionSurfaceDensity>}
   */
  public readonly density: InputSignal<CollectionSurfaceDensity> =
    input<CollectionSurfaceDensity>('comfortable');

  /**
   * Property compactBreakpoint
   * @readonly
   *
   * @description
   * The `@container/surface` width at which the table replaces the card
   * layout. Defaults to `'2xl'`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CollectionSurfaceBreakpoint>}
   */
  public readonly compactBreakpoint: InputSignal<CollectionSurfaceBreakpoint> =
    input<CollectionSurfaceBreakpoint>('2xl');
  //#endregion

  //#region Properties
  /**
   * Property isInitialLoading
   * @readonly
   *
   * @description
   * Whether the skeleton draws instead of the caller's `[surfaceRows]`
   * content — the "first load only" contract: {@link loading} with
   * {@link rowCount} already above `0` renders the real rows undisturbed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isInitialLoading: Signal<boolean> = computed<boolean>(
    () => this.loading() && this.rowCount() === 0,
  );

  /**
   * Property visibleSlot
   * @readonly
   *
   * @description
   * The routing decision: `'surface'` covers both the first-load skeleton
   * and real data, since both render the same table/card shell — only the
   * `<tbody>` content differs (see {@link isInitialLoading}). Otherwise a
   * failed fetch beats an empty result.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<CollectionSurfaceSlot>}
   */
  protected readonly visibleSlot: Signal<CollectionSurfaceSlot> = computed<CollectionSurfaceSlot>(
    () => {
      if (this.isInitialLoading()) return 'surface';
      if (this.hasError()) return 'error';
      if (this.rowCount() === 0) return 'empty';

      return 'surface';
    },
  );

  /**
   * Property captionId
   * @readonly
   *
   * @description
   * The `<caption>` element's id, and the value the scroll region's
   * `aria-labelledby` points at.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly captionId: Signal<string> = computed<string>(() => `${this.testId()}-caption`);

  /**
   * Property tableWrapperClass
   * @readonly
   *
   * @description
   * The bordered outer shell's classes, hidden below
   * {@link compactBreakpoint} in favor of the card layout. It takes the host's
   * height as a flex item (`flex-1 min-h-0`) rather than `h-full`, which only
   * resolves when every ancestor already has a definite height.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  /**
   * Property containerClass
   * @readonly
   *
   * @description
   * The scroll container's classes. It fills its wrapper by default, and takes
   * {@link maxHeight} instead when the caller bounds it — a `h-full` inside an
   * unbounded parent resolves to `auto`, so a panel that must scroll its own
   * body has to say how tall it may get.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<string>}
   */
  protected readonly containerClass: Signal<string> = computed<string>(() => {
    const base: string =
      'overflow-y-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring';
    const height: string = this.maxHeight() ?? 'h-full';

    return `${base} ${height}`;
  });

  protected readonly tableWrapperClass: Signal<string> = computed<string>(() => {
    const base: string = 'min-h-0 flex-1 overflow-hidden rounded-md border border-border';

    switch (this.compactBreakpoint()) {
      case 'xl':
        return `${base} hidden @xl/surface:block`;
      case '3xl':
        return `${base} hidden @3xl/surface:block`;
      case '2xl':
      default:
        return `${base} hidden @2xl/surface:block`;
    }
  });

  /**
   * Property cardsWrapperClass
   * @readonly
   *
   * @description
   * The card layout's classes, hidden at and above
   * {@link compactBreakpoint} in favor of the table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly cardsWrapperClass: Signal<string> = computed<string>(() => {
    switch (this.compactBreakpoint()) {
      case 'xl':
        return 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto @xl/surface:hidden';
      case '3xl':
        return 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto @3xl/surface:hidden';
      case '2xl':
      default:
        return 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto @2xl/surface:hidden';
    }
  });

  /**
   * Property theadClass
   * @readonly
   *
   * @description
   * The sticky head's own classes, plus the Label-rung correction
   * (`text-xs font-medium`) and the {@link density}-driven head height —
   * all targeting the caller's projected `[data-slot=table-head]` cells
   * through a descendant selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly theadClass: Signal<string> = computed<string>(() => {
    const base: string =
      'sticky top-0 z-10 bg-background [&_[data-slot=table-head]]:text-xs [&_[data-slot=table-head]]:font-medium';

    switch (this.density()) {
      case 'compact':
        return `${base} [&_[data-slot=table-head]]:h-9 [&_[data-slot=table-head]]:px-2 [&_[data-slot=table-head]]:py-1.5`;
      case 'comfortable':
      default:
        return `${base} [&_[data-slot=table-head]]:h-11 [&_[data-slot=table-head]]:px-3 [&_[data-slot=table-head]]:py-2.5`;
    }
  });

  /**
   * Property tbodyClass
   * @readonly
   *
   * @description
   * The body's zebra striping (`DESIGN.md`'s "Wash" tonal step, on every
   * even projected `<tr>`) plus the {@link density}-driven cell padding,
   * targeting the caller's projected `[data-slot=table-cell]` cells through
   * a descendant selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly tbodyClass: Signal<string> = computed<string>(() => {
    const base: string = '[&>tr]:even:bg-muted/40';

    switch (this.density()) {
      case 'compact':
        return `${base} [&_[data-slot=table-cell]]:px-2 [&_[data-slot=table-cell]]:py-1.5`;
      case 'comfortable':
      default:
        return `${base} [&_[data-slot=table-cell]]:min-h-11 [&_[data-slot=table-cell]]:px-3 [&_[data-slot=table-cell]]:py-2.5`;
    }
  });
  //#endregion
}
