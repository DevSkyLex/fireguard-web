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
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmCaption, HlmTable, HlmTableContainer, HlmTBody, HlmTHead } from '@shared/ui/table';
import { CollectionSkeletonCards } from '../collection-skeleton-cards';
import { CollectionSkeletonRows } from '../collection-skeleton-rows';

/** Which region the template shows once the first-load skeleton no longer applies. */
type CollectionSurfaceSlot = 'error' | 'empty' | 'surface';

/**
 * Component CollectionSurface
 * @class CollectionSurface
 * @description Presentational collection shell that owns first-load, error, empty and content
 * precedence. Desktop always renders the native table. Mobile may use caller-provided cards below
 * the configured container breakpoint while roomy tablets retain the table and touch targets.
 * The caller owns queries, pagination and every domain decision.
 * @version 1.0.0
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
    CollectionSkeletonCards,
    CollectionSkeletonRows,
    ...HlmSpinnerImports,
  ],
  host: {
    class:
      '@container/surface relative flex h-full w-full min-h-0 flex-col mobile-ui:h-auto mobile-ui:min-h-fit mobile-ui:md:h-full mobile-ui:md:min-h-0',
    '[attr.aria-busy]': 'loading()',
  },
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
   * Property hasLoaded
   * @readonly
   *
   * @description
   * Whether a completed result, including an empty one, exists and must survive refresh.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasLoaded: InputSignal<boolean> = input<boolean>(false);

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
   * the first-load guard and the empty-state routing, so callers do not have
   * to re-derive `loading() && items().length === 0` on their own.
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
   * Property density
   * @readonly
   *
   * @description
   * The row rhythm — `'comfortable'` (default, with at least 44px rows) or
   * `'compact'`. Headers deliberately keep the installed Spartan defaults;
   * the value only adjusts the projected body-cell spacing.
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
   * The mobile `@container/surface` width at which a table replaces cards.
   * Desktop always shows the table. Defaults to `'2xl'`.
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
    () => this.loading() && !this.hasLoaded() && this.rowCount() === 0,
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

  /**
   * Property tableWrapperClass
   * @readonly
   *
   * @description
   * The bordered outer shell's classes, hidden only in mobile interaction mode below
   * {@link compactBreakpoint} in favor of cards. It grows as a bounded flex
   * item so the table body can own its scrolling.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly tableWrapperClass: Signal<string> = computed<string>(() => {
    const base: string = 'min-h-0 flex-1 overflow-hidden rounded-md border border-border';

    switch (this.compactBreakpoint()) {
      case 'xl':
        return `${base} block mobile-ui:hidden mobile-ui:@xl/surface:block`;
      case '3xl':
        return `${base} block mobile-ui:hidden mobile-ui:@3xl/surface:block`;
      case '2xl':
      default:
        return `${base} block mobile-ui:hidden mobile-ui:@2xl/surface:block`;
    }
  });

  /**
   * Property cardsWrapperClass
   * @readonly
   *
   * @description
   * Mobile card layout, hidden on desktop and on mobile containers wide enough
   * for the table at {@link compactBreakpoint}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly cardsWrapperClass: Signal<string> = computed<string>(() => {
    switch (this.compactBreakpoint()) {
      case 'xl':
        return 'hidden min-h-fit flex-none flex-col gap-2 overflow-visible mobile-ui:flex md:min-h-0 md:flex-1 md:overflow-y-auto mobile-ui:@xl/surface:hidden';
      case '3xl':
        return 'hidden min-h-fit flex-none flex-col gap-2 overflow-visible mobile-ui:flex md:min-h-0 md:flex-1 md:overflow-y-auto mobile-ui:@3xl/surface:hidden';
      case '2xl':
      default:
        return 'hidden min-h-fit flex-none flex-col gap-2 overflow-visible mobile-ui:flex md:min-h-0 md:flex-1 md:overflow-y-auto mobile-ui:@2xl/surface:hidden';
    }
  });

  /**
   * Property tbodyClass
   * @readonly
   *
   * @description
   * The body's subtle zebra striping (`DESIGN.md`'s "Wash" tonal step, on every
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
    const base: string = '[&>tr]:even:bg-muted/20';

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
