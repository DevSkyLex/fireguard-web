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
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
} from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';
import { HlmLabel } from '@shared/ui/label';
import { HlmPaginationImports } from '@shared/ui/pagination';
import { HlmSelectImports } from '@shared/ui/select';

/** The rows-per-page choices offered when a consumer does not supply its own. */
const DEFAULT_PAGE_SIZES: readonly number[] = [30, 60, 100];

/**
 * Component CollectionPagination
 * @class CollectionPagination
 *
 * @description
 * The pagination band shared by every collection surface's list page: a
 * "N of M row(s) shown" status, a rows-per-page `hlm-select`, a "Page X of Y"
 * indicator, numbered pages, and first/previous/next/last navigation built on the vendored
 * `hlmPagination` primitives. Presentational (`ARCHITECTURE.md` §10.3) — it
 * injects no store and calls no service; the host page owns pagination state
 * and reacts to `pageChanged`/`pageSizeChanged`. Native `hlmPaginationLink`
 * buttons mark the current page without supplying a router link. Five page
 * numbers surround the current page on desktop; three remain on small screens,
 * where first/last shortcuts are hidden to retain comfortable touch targets.
 * Both ranges render identically during SSR and hydration; CSS selects their
 * visibility. Moved from `features/organization` to `shared` as a
 * deliberate uniformity bet, recorded in `organization/FEATURE.md` § UI
 * Conventions — the folder held only organization consumers at the time of
 * the move.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-pagination',
  imports: [NgIcon, HlmButton, HlmLabel, ...HlmPaginationImports, ...HlmSelectImports],
  providers: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronsLeft,
      lucideChevronsRight,
    }),
  ],
  templateUrl: './collection-pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionPagination {
  //#region Inputs
  /**
   * Property page
   * @readonly
   * @description The current 1-based page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input.required<number>();

  /**
   * Property pageCount
   * @readonly
   * @description The total number of pages.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly pageCount: InputSignal<number> = input.required<number>();

  /**
   * Property pageSize
   * @readonly
   * @description The currently selected rows-per-page value.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly pageSize: InputSignal<number> = input.required<number>();

  /**
   * Property pageSizes
   * @readonly
   * @description The rows-per-page choices offered by the select. Defaults to `[30, 60, 100]`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly number[]>}
   */
  public readonly pageSizes: InputSignal<readonly number[]> =
    input<readonly number[]>(DEFAULT_PAGE_SIZES);

  /**
   * Property total
   * @readonly
   * @description The total row count across every page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly total: InputSignal<number> = input.required<number>();

  /**
   * Property shown
   * @readonly
   * @description The row count rendered on the current page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly shown: InputSignal<number> = input.required<number>();

  /**
   * Property testIdPrefix
   * @readonly
   * @description
   * The owning list page's `data-testid` prefix (e.g. `interventions`). Every
   * control's `data-testid` is `<prefix>-page-first`, `-page-prev`,
   * `-page-next`, `-page-last`, `-page-size`, `-page-indicator`, `-row-count`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testIdPrefix: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property pageChanged
   * @readonly
   * @description The user asked to go to a different page.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property pageSizeChanged
   * @readonly
   * @description The user picked a different rows-per-page value.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageSizeChanged: OutputEmitterRef<number> = output<number>();
  //#endregion

  //#region Properties
  /**
   * Property pageNumbers
   * @readonly
   * @description Up to five consecutive pages surrounding the current page.
   * @access protected
   * @since 2.1.0
   * @type {Signal<readonly number[]>}
   */
  protected readonly pageNumbers: Signal<readonly number[]> = computed(() => this.pageWindow(5));

  /**
   * Property compactPageNumbers
   * @readonly
   * @description The three-page subset retained on narrow screens.
   * @access protected
   * @since 2.1.0
   * @type {Signal<readonly number[]>}
   */
  protected readonly compactPageNumbers: Signal<readonly number[]> = computed(() =>
    this.pageWindow(3),
  );

  /**
   * Property rowCountLabel
   * @readonly
   * @description The localized "N of M row(s) shown" status text.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly rowCountLabel: Signal<string> = computed<string>(() => {
    const shown: number = this.shown();
    const total: number = this.total();

    return $localize`:@@org.listPagination.rowCount:${shown}:shown: of ${total}:total: row(s) shown`;
  });

  /**
   * Property pageIndicatorLabel
   * @readonly
   * @description The localized "Page X of Y" text.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly pageIndicatorLabel: Signal<string> = computed<string>(() => {
    const page: number = this.page();
    const pageCount: number = this.pageCount();

    return $localize`:@@org.listPagination.pageIndicator:Page ${page}:page: of ${pageCount}:pageCount:`;
  });

  /** The rows-per-page select's label. */
  protected readonly pageSizeLabel: string = $localize`:@@org.listPagination.pageSizeLabel:Rows per page:`;

  /** The pagination nav's accessible name, replacing `hlmPagination`'s untranslated default. */
  protected readonly ariaNav: string = $localize`:@@org.listPagination.nav:Pagination`;

  /** The "first page" button's accessible name. */
  protected readonly ariaFirst: string = $localize`:@@org.listPagination.ariaFirst:First page`;

  /** The "previous page" button's accessible name. */
  protected readonly ariaPrevious: string = $localize`:@@org.listPagination.ariaPrevious:Previous page`;

  /** The "next page" button's accessible name. */
  protected readonly ariaNext: string = $localize`:@@org.listPagination.ariaNext:Next page`;

  /** The "last page" button's accessible name. */
  protected readonly ariaLast: string = $localize`:@@org.listPagination.ariaLast:Last page`;

  /**
   * Property canGoBack
   * @readonly
   * @description Whether {@link page} is past the first page.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canGoBack: Signal<boolean> = computed<boolean>(() => this.page() > 1);

  /**
   * Property canGoForward
   * @readonly
   * @description Whether {@link page} is before the last page. `false` when {@link pageCount} is `0`.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canGoForward: Signal<boolean> = computed<boolean>(
    () => this.pageCount() > 0 && this.page() < this.pageCount(),
  );
  //#endregion

  //#region Methods
  /**
   * Method pageWindow
   * @description Centers a bounded window on the current page, shifting it at either edge.
   * @access private
   * @since 2.1.0
   * @param {number} limit - Maximum number of visible page numbers.
   * @returns {readonly number[]} Consecutive pages, including page one for an empty collection.
   */
  private pageWindow(limit: number): readonly number[] {
    const total: number = Math.max(1, this.pageCount());
    const count: number = Math.min(limit, total);
    const start: number = Math.max(
      1,
      Math.min(this.page() - Math.floor(count / 2), total - count + 1),
    );

    return Array.from({ length: count }, (_, index: number) => start + index);
  }

  /**
   * Method testId
   * @description Builds a `<prefix>-<suffix>` `data-testid` value from {@link testIdPrefix}.
   * @access protected
   * @since 1.0.0
   * @param {string} suffix - The control-specific suffix, e.g. `'page-first'`.
   * @returns {string} The full `data-testid` value.
   */
  protected testId(suffix: string): string {
    return `${this.testIdPrefix()}-${suffix}`;
  }

  /**
   * Method goToPage
   * @description
   * Clamps `target` to `[1, max(pageCount(), 1)]` and emits {@link pageChanged}
   * with the clamped value, unless it equals the current {@link page}.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The page to navigate to.
   * @returns {void}
   */
  protected goToPage(target: number): void {
    const upper: number = Math.max(this.pageCount(), 1);
    const clamped: number = Math.min(Math.max(target, 1), upper);

    if (clamped !== this.page()) {
      this.pageChanged.emit(clamped);
    }
  }

  /**
   * Method changePageSize
   * @description
   * Emits {@link pageSizeChanged} for the picked value, falling back to the
   * current {@link pageSize} when the select clears its selection.
   * @access protected
   * @since 1.0.0
   * @param {number | null | undefined} next - The value picked in the select.
   * @returns {void}
   */
  protected changePageSize(next: number | null | undefined): void {
    this.pageSizeChanged.emit(next ?? this.pageSize());
  }
  //#endregion
}
