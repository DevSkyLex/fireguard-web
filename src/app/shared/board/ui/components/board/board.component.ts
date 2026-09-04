import { CdkDrag, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleCheck,
} from '@ng-icons/lucide';
import type { BoardCardContext, BoardColumn, BoardItem, BoardMove } from '@shared/board/models';
import { BoardCardDirective } from '@shared/board/ui/directives/board-card';
import { BoardColumnHeaderDirective } from '@shared/board/ui/directives/board-column-header';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';

/**
 * Component Board
 * @class Board
 *
 * @description
 * Renders caller-owned columns and typed card templates, with validated move requests and bounded scrolling.
 * Drag feedback identifies legal destinations before release without changing drop-zone geometry.
 * Browser-only geometry and focus handling preserve SSR and keyboard navigation.
 *
 * @template T - The caller-owned card data.
 * @template K - The column identifier type.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-board',
  imports: [CdkDrag, CdkDropList, NgTemplateOutlet, HlmBadge, HlmButton, NgIcon],
  providers: [
    provideIcons({ lucideBan, lucideChevronLeft, lucideChevronRight, lucideCircleCheck }),
  ],
  templateUrl: './board.component.html',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Board<T, K extends string = string> {
  //#region Inputs
  /**
   * Property boardId
   * @readonly
   *
   * @description
   * Stable, document-unique prefix for drop zones and accessible headings.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly boardId: InputSignal<string> = input.required<string>();

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Ordered columns and cards, including empty columns; the caller owns grouping.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly BoardColumn<T, K>[]>}
   */
  public readonly columns: InputSignal<readonly BoardColumn<T, K>[]> =
    input.required<readonly BoardColumn<T, K>[]>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the horizontal scroll region.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>($localize`:@@board.label:Board`);

  /**
   * Property canMove
   * @readonly
   *
   * @description
   * Caller policy checked for both dragging and template move requests.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<(item: T, columnId: K) => boolean>}
   */
  public readonly canMove: InputSignal<(item: T, columnId: K) => boolean> = input<
    (item: T, columnId: K) => boolean
  >(() => false);

  /**
   * Property moveBlockedReason
   * @readonly
   *
   * @description
   * Optional caller-owned explanation for a forbidden destination; absent reasons use the generic hint.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<(item: T, columnId: K) => string | null>}
   */
  public readonly moveBlockedReason: InputSignal<(item: T, columnId: K) => string | null> = input<
    (item: T, columnId: K) => string | null
  >(() => null);

  /**
   * Property emptyLabel
   * @readonly
   *
   * @description
   * Empty-column copy, optionally specialized by the caller.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyLabel: InputSignal<string> = input<string>(
    $localize`:@@board.emptyColumn:No items.`,
  );
  //#endregion

  //#region Outputs
  /**
   * Property moveRequested
   * @readonly
   *
   * @description
   * Validated move request; persistence and rollback remain the caller’s responsibility.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<BoardMove<T, K>>}
   */
  public readonly moveRequested: OutputEmitterRef<BoardMove<T, K>> = output<BoardMove<T, K>>();

  //#endregion

  //#region Properties
  /**
   * Property columnHeaderTemplate
   * @readonly
   *
   * @description
   * Optional column heading presentation; the column label remains the default.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<BoardColumnHeaderDirective<T, K> | undefined>}
   */
  protected readonly columnHeaderTemplate: Signal<BoardColumnHeaderDirective<T, K> | undefined> =
    contentChild<BoardColumnHeaderDirective<T, K>>(BoardColumnHeaderDirective);

  /**
   * Property cardTemplate
   * @readonly
   *
   * @description
   * Optional presentation slot; read-only item labels render without one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BoardCardDirective<T, K> | undefined>}
   */
  protected readonly cardTemplate: Signal<BoardCardDirective<T, K> | undefined> =
    contentChild<BoardCardDirective<T, K>>(BoardCardDirective);

  /**
   * Property scroller
   * @readonly
   *
   * @description
   * Horizontal viewport observed for resizing and used by column navigation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  protected readonly scroller: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('scroller');

  /**
   * Property track
   * @readonly
   *
   * @description
   * Column row observed so changing column counts refresh the scroll controls.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  protected readonly track: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('track');

  /**
   * Property canScrollLeft
   * @readonly
   *
   * @description
   * Whether earlier columns remain outside the visible track.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly canScrollLeft: WritableSignal<boolean> = signal(false);

  /**
   * Property canScrollRight
   * @readonly
   *
   * @description
   * Whether later columns remain outside the visible track.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly canScrollRight: WritableSignal<boolean> = signal(false);

  /**
   * Property liveMessage
   * @readonly
   *
   * @description
   * Polite announcement of the last requested move, without claiming server success.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly liveMessage: WritableSignal<string> = signal('');

  /**
   * Property draggedItemId
   * @readonly
   *
   * @description
   * Identifies the active pointer or touch drag until it ends or is cancelled.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly draggedItemId: WritableSignal<string | null> = signal(null);

  /**
   * Property dropStates
   * @readonly
   *
   * @description
   * Derives destination feedback from the same current policy as the drop predicate, preserving the source column.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<ReadonlyMap<K, 'source' | 'allowed' | 'blocked'>>}
   */
  protected readonly dropStates: Signal<ReadonlyMap<K, 'source' | 'allowed' | 'blocked'>> =
    computed(() => {
      const id = this.draggedItemId();
      if (id === null) return new Map();
      const source = this.columns().find((column) => column.items.some((item) => item.id === id));
      return new Map(
        this.columns().map((column) => [
          column.id,
          column.id === source?.id
            ? 'source'
            : this.allowedItem(id, column.id)
              ? 'allowed'
              : 'blocked',
        ]),
      );
    });

  /**
   * Property dropListIds
   * @readonly
   *
   * @description
   * Drop-zone connections scoped to this board instance.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string[]>}
   */
  protected readonly dropListIds: Signal<string[]> = computed(() =>
    this.columns().map((column) => this.columnId(column.id)),
  );

  //#endregion

  //#region Dependencies
  /**
   * Property elementRef
   * @readonly
   *
   * @description
   * Board host used to locate the recreated card after a move.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injection context for post-render focus restoration.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Disconnects geometry observers when the board is destroyed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts geometry observation after browser rendering and disconnects it on teardown.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => {
      this.updateScrollAffordance();
      const observer = new ResizeObserver(() => this.updateScrollAffordance());
      observer.observe(this.scroller().nativeElement);
      observer.observe(this.track().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  //#endregion

  //#region Methods
  /**
   * Method columnId
   * @method columnId
   *
   * @description
   * Produces a stable DOM identifier scoped to this board.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {K} key - The column identifier.
   * @returns {string}
   */
  protected columnId(key: K): string {
    return `${this.boardId()}-column-${encodeURIComponent(key)}`;
  }

  /**
   * Method countLabel
   * @method countLabel
   *
   * @description
   * Names the count and its column for screen-reader navigation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BoardColumn<T, K>} column - The counted column.
   * @returns {string}
   */
  protected countLabel(column: BoardColumn<T, K>): string {
    return $localize`:@@board.columnCount:${column.items.length}:count: items in ${column.label}:column:`;
  }

  /**
   * Method cardContext
   * @method cardContext
   *
   * @description
   * Supplies typed slot bindings and routes template actions through the move policy.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BoardItem<T>} item - The rendered card.
   * @param {BoardColumn<T, K>} column - Its current column.
   * @returns {BoardCardContext<T, K>}
   */
  protected cardContext(item: BoardItem<T>, column: BoardColumn<T, K>): BoardCardContext<T, K> {
    return { $implicit: item, column, move: (target) => this.requestMove(item.id, target) };
  }

  /**
   * Method dragDisabled
   * @method dragDisabled
   *
   * @description
   * Dragging requires a card slot with an alternative move control and a legal destination.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BoardItem<T>} item - The candidate card.
   * @param {BoardColumn<T, K>} column - Its current column.
   * @returns {boolean}
   */
  protected dragDisabled(item: BoardItem<T>, column: BoardColumn<T, K>): boolean {
    return (
      !this.cardTemplate() ||
      !!item.disabled ||
      !this.columns().some(
        (target) => target.id !== column.id && this.canMove()(item.data, target.id),
      )
    );
  }

  /**
   * Method canDrop
   * @method canDrop
   *
   * @description
   * Rechecks current inputs so in-flight updates cannot leave stale drag permissions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDrag<BoardItem<T>>} drag - The dragged card.
   * @param {CdkDropList<K>} drop - The candidate drop zone.
   * @returns {boolean}
   */
  protected readonly canDrop = (drag: CdkDrag<BoardItem<T>>, drop: CdkDropList<K>): boolean =>
    this.allowedItem(drag.data.id, drop.data) !== undefined;

  /**
   * Method onDragStarted
   * @method onDragStarted
   *
   * @description
   * Reveals destination feedback and announces the available column labels before release.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {BoardItem<T>} item - The dragged card.
   * @returns {void}
   */
  protected onDragStarted(item: BoardItem<T>): void {
    this.draggedItemId.set(item.id);
    const destinations = this.columns()
      .filter((column) => this.dropStates().get(column.id) === 'allowed')
      .map((column) => column.label)
      .join(', ');
    this.liveMessage.set(
      $localize`:@@board.dragStarted:Moving ${item.label}:item:. Available destinations: ${destinations}:destinations:.`,
    );
  }

  /**
   * Method dropBlockedReason
   * @method dropBlockedReason
   *
   * @description
   * Resolves the caller's explanation against the current dragged item without retaining stale card data.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {K} target - The forbidden destination.
   * @returns {string | null}
   */
  protected dropBlockedReason(target: K): string | null {
    const item = this.columns()
      .flatMap((column) => column.items)
      .find((candidate) => candidate.id === this.draggedItemId());
    return item ? this.moveBlockedReason()(item.data, target) : null;
  }

  /**
   * Method onDropped
   * @method onDropped
   *
   * @description
   * Forwards cross-column drops only while the pointer is inside an accepted destination.
   * CDK can retain the last accepted container when the pointer moves over a forbidden column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDragDrop<K, K, BoardItem<T>>} event - The completed CDK drop.
   * @returns {void}
   */
  protected onDropped(event: CdkDragDrop<K, K, BoardItem<T>>): void {
    if (!event.isPointerOverContainer || event.previousContainer === event.container) return;
    this.requestMove(event.item.data.id, event.container.data);
  }

  /**
   * Method requestMove
   * @method requestMove
   *
   * @description
   * Revalidates and announces the request, then restores focus after the caller reparents the card.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} id - The card identifier.
   * @param {K} target - The destination column.
   * @returns {void}
   */
  private requestMove(id: string, target: K): void {
    const item = this.allowedItem(id, target);
    const column = this.columns().find((candidate) => candidate.id === target);
    if (!item || !column) return;

    this.moveRequested.emit({ item: item.data, columnId: target });
    this.liveMessage.set(
      $localize`:@@board.moveRequested:Move requested for ${item.label}:item: to ${column.label}:column:.`,
    );
    afterNextRender(
      () => {
        const card = Array.from(
          this.elementRef.nativeElement.querySelectorAll<HTMLElement>('[data-board-item-id]'),
        ).find((element) => element.dataset['boardItemId'] === id);
        card
          ?.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]')
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  /**
   * Method allowedItem
   * @method allowedItem
   *
   * @description
   * Rejects unknown targets or cards, same-column moves and disabled or forbidden cards.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} id - The card identifier.
   * @param {K} target - The destination column.
   * @returns {BoardItem<T> | undefined}
   */
  private allowedItem(id: string, target: K): BoardItem<T> | undefined {
    if (!this.columns().some((column) => column.id === target)) return undefined;
    for (const column of this.columns()) {
      const item = column.items.find((candidate) => candidate.id === id);
      if (item) {
        return column.id !== target && !item.disabled && this.canMove()(item.data, target)
          ? item
          : undefined;
      }
    }
    return undefined;
  }

  /**
   * Method scrollColumns
   * @method scrollColumns
   *
   * @description
   * Advances by whole columns while respecting reduced-motion preferences.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {-1 | 1} direction - Earlier (-1) or later (1) columns.
   * @returns {void}
   */
  protected scrollColumns(direction: -1 | 1): void {
    const element = this.scroller().nativeElement;
    const column = this.track().nativeElement.firstElementChild;
    if (!column) return;
    const step = column.getBoundingClientRect().width + 12;
    const count = Math.max(1, Math.floor(element.clientWidth / step));
    element.scrollBy({
      left: direction * count * step,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  /**
   * Method updateScrollAffordance
   * @method updateScrollAffordance
   *
   * @description
   * Refreshes navigation availability from actual overflow, including tab visibility changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected updateScrollAffordance(): void {
    const element = this.scroller().nativeElement;
    this.canScrollLeft.set(element.scrollLeft > 1);
    this.canScrollRight.set(element.scrollLeft < element.scrollWidth - element.clientWidth - 1);
  }
  //#endregion
}
