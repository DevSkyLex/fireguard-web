import {
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  type CdkDragDrop,
  type DragStartDelay,
} from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { BoardCardDirective } from './board-card.directive';
import { BoardColumnHeaderDirective } from './board-column-header.directive';
import type {
  BoardCardContext,
  BoardColumn,
  BoardColumnHeaderContext,
  BoardItemDropped,
} from './models';

/**
 * Component Board
 * @class Board
 *
 * @description
 * Generic, domain-agnostic kanban board built on `@angular/cdk/drag-drop`.
 * Renders {@link BoardColumn}s of items and lets the user drag an item
 * between columns. It never mutates its `columns` input: a cross-column drop
 * only emits {@link itemDropped} so the owning store can apply the move and
 * re-render. Column header and card markup are supplied by the consumer
 * through the `[appBoardColumnHeader]` and `[appBoardCard]` projected
 * templates; the board carries no business knowledge.
 *
 * @example ```html
 * <app-board [columns]="columns()" [itemId]="idOf" [canDrop]="canMove" (itemDropped)="onMove($event)">
 *   <ng-template appBoardColumnHeader let-column let-count="count">{{ column.id }} ({{ count }})</ng-template>
 *   <ng-template appBoardCard let-item>{{ item.title }}</ng-template>
 * </app-board>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-board',
  imports: [CdkDrag, CdkDropList, CdkDropListGroup, NgTemplateOutlet],
  templateUrl: './board.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Flex-column host so the lanes track (flex-1) fills whatever height the
  // consumer gives the board — a child h-full cannot resolve against the
  // host's auto block height.
  host: { class: 'flex min-h-0 flex-col' },
})
export class Board<T> {
  //#region Inputs
  /**
   * Property columns
   * @readonly
   *
   * @description
   * Columns to render, each holding its own items in display order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly BoardColumn<T>[]>}
   */
  public readonly columns: InputSignal<readonly BoardColumn<T>[]> =
    input.required<readonly BoardColumn<T>[]>();

  /**
   * Property itemId
   * @readonly
   *
   * @description
   * Resolves a stable identifier for an item, used for row tracking.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<(item: T) => string>}
   */
  public readonly itemId: InputSignal<(item: T) => string> = input.required<(item: T) => string>();

  /**
   * Property canDrop
   * @readonly
   *
   * @description
   * Predicate deciding whether an item may move from one column to another.
   * Backs the CDK enter predicate so an invalid target visually rejects the
   * drag. Defaults to always allowing the move.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<(item: T, fromColumnId: string, toColumnId: string) => boolean>}
   */
  public readonly canDrop: InputSignal<
    (item: T, fromColumnId: string, toColumnId: string) => boolean
  > = input<(item: T, fromColumnId: string, toColumnId: string) => boolean>(() => true);

  /**
   * Property dragDisabled
   * @readonly
   *
   * @description
   * When `true`, disables dragging across every column (e.g. while the
   * parent is saving a previous move).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly dragDisabled: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Content templates
  /**
   * Property columnHeaderDirective
   * @readonly
   *
   * @description
   * Projected `[appBoardColumnHeader]` directive instance, read to reach its
   * captured `TemplateRef`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<BoardColumnHeaderDirective<T> | undefined>}
   */
  private readonly columnHeaderDirective: Signal<BoardColumnHeaderDirective<T> | undefined> =
    contentChild(BoardColumnHeaderDirective) as Signal<BoardColumnHeaderDirective<T> | undefined>;

  /**
   * Property cardDirective
   * @readonly
   *
   * @description
   * Projected `[appBoardCard]` directive instance, read to reach its
   * captured `TemplateRef`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<BoardCardDirective<T> | undefined>}
   */
  private readonly cardDirective: Signal<BoardCardDirective<T> | undefined> = contentChild(
    BoardCardDirective,
  ) as Signal<BoardCardDirective<T> | undefined>;

  /**
   * Property columnHeaderTemplate
   * @readonly
   *
   * @description
   * Column-header template, falling back to a built-in header when the
   * consumer projects none.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<BoardColumnHeaderContext<T>> | undefined>}
   */
  protected readonly columnHeaderTemplate: Signal<
    TemplateRef<BoardColumnHeaderContext<T>> | undefined
  > = computed(() => this.columnHeaderDirective()?.templateRef);

  /**
   * Property cardTemplate
   * @readonly
   *
   * @description
   * Card template rendered for each item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<BoardCardContext<T>> | undefined>}
   */
  protected readonly cardTemplate: Signal<TemplateRef<BoardCardContext<T>> | undefined> = computed(
    () => this.cardDirective()?.templateRef,
  );
  //#endregion

  //#region Outputs
  /**
   * Property itemDropped
   * @readonly
   *
   * @description
   * Emits when an item is dropped into a different column. The board does
   * not mutate `columns`; the parent applies the move.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<BoardItemDropped<T>>}
   */
  public readonly itemDropped: OutputEmitterRef<BoardItemDropped<T>> =
    output<BoardItemDropped<T>>();
  //#endregion

  //#region State
  /**
   * Property dragStartDelay
   * @readonly
   *
   * @description
   * Short press-and-hold delay on touch inputs so a drag does not fire on a
   * scroll gesture; mouse drags start immediately.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DragStartDelay}
   */
  protected readonly dragStartDelay: DragStartDelay = { touch: 150, mouse: 0 };
  //#endregion

  //#region Methods
  /**
   * Method enterPredicate
   *
   * @description
   * CDK drop-list enter predicate: rejects the hovered column when
   * {@link canDrop} refuses the move, so the drop zone visually declines it.
   * Bound as an arrow-function class property so `this` stays correct when
   * CDK invokes it directly.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDrag<T>} drag - The item being dragged.
   * @param {CdkDropList<string>} drop - The drop list currently under the pointer.
   * @returns {boolean} Whether the item may enter this column.
   */
  protected readonly enterPredicate = (drag: CdkDrag<T>, drop: CdkDropList<string>): boolean => {
    const fromColumnId: string = drag.dropContainer.data as string;
    const toColumnId: string = drop.data;
    if (fromColumnId === toColumnId) return true;
    return this.canDrop()(drag.data, fromColumnId, toColumnId);
  };

  /**
   * Method onDropped
   *
   * @description
   * Handles a CDK drop: emits {@link itemDropped} for a cross-column move
   * that {@link canDrop} allows, and does nothing otherwise. Never mutates
   * `columns` directly.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDragDrop<string>} event - The CDK drop event.
   * @param {string} toColumnId - Id of the column the item was dropped into.
   * @returns {void}
   */
  protected onDropped(event: CdkDragDrop<string>, toColumnId: string): void {
    const fromColumnId: string = event.previousContainer.data;
    if (fromColumnId === toColumnId) return;

    const item: T = event.item.data as T;
    if (!this.canDrop()(item, fromColumnId, toColumnId)) return;

    this.itemDropped.emit({ item, fromColumnId, toColumnId });
  }
  //#endregion
}
