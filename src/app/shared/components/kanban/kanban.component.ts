import {
  CdkDrag,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
  type CdkDragDrop,
} from '@angular/cdk/drag-drop';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import type { KanbanCard, KanbanCardContext, KanbanColumn, KanbanDropEvent } from './models';

/**
 * Type KanbanDropPredicate
 *
 * @description
 * Guard deciding whether a card may be dropped into a lane. Receives the dragged
 * card and the target lane identifier; returning `false` blocks the drop.
 *
 * @since 1.0.0
 */
type KanbanDropPredicate = (card: KanbanCard, toColumnId: string) => boolean;

/**
 * Component Kanban
 * @class Kanban
 *
 * @description
 * Generic, domain-agnostic Kanban board. Renders {@link KanbanColumn} lanes wired
 * into a single CDK drop-list group so cards drag between lanes, gates drops with
 * a consumer-supplied predicate, and emits a {@link KanbanDropEvent} for legal
 * cross-lane moves. Card bodies are projected through a `<ng-template #card
 * let-card>`; the board owns only the lane scaffolding, headers and drag-and-drop
 * and carries no business knowledge.
 *
 * @example ```html
 * <app-kanban [columns]="columns()" [canDrop]="canDrop" (cardDropped)="onDrop($event)">
 *   <ng-template #card let-card>{{ card.id }}</ng-template>
 * </app-kanban>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-kanban',
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDropList,
    CdkDropListGroup,
    NgClass,
    NgTemplateOutlet,
    SkeletonModule,
  ],
  templateUrl: './kanban.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kanban {
  //#region Inputs
  /**
   * Property columns
   * @readonly
   *
   * @description
   * Lanes to render, left to right.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly KanbanColumn[]>}
   */
  public readonly columns: InputSignal<readonly KanbanColumn[]> = input<readonly KanbanColumn[]>(
    [],
  );

  /**
   * Property canDrop
   * @readonly
   *
   * @description
   * Predicate gating drops per lane; defaults to allowing every drop. Same-lane
   * drops never emit regardless of the predicate.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<KanbanDropPredicate>}
   */
  public readonly canDrop: InputSignal<KanbanDropPredicate> = input<KanbanDropPredicate>(
    () => true,
  );

  /**
   * Property emptyColumnLabel
   * @readonly
   *
   * @description
   * Optional placeholder shown in a lane with no cards. Nothing is rendered when
   * empty, so the host stays in control of its wording and localization.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyColumnLabel: InputSignal<string> = input<string>('');

  /**
   * Property loading
   * @readonly
   *
   * @description
   * When true, the board renders a skeleton placeholder (lanes of skeleton cards)
   * inside its card surface instead of the real columns, mirroring the loading
   * behavior of the shared calendar component.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumns
   * @readonly
   *
   * @description
   * Placeholder lanes rendered while {@link loading} is true.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {readonly undefined[]}
   */
  protected readonly skeletonColumns: readonly undefined[] = Array<undefined>(4);

  /**
   * Property skeletonCards
   * @readonly
   *
   * @description
   * Placeholder cards rendered per skeleton lane.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {readonly undefined[]}
   */
  protected readonly skeletonCards: readonly undefined[] = Array<undefined>(3);

  /**
   * Property dragPreviewClass
   * @readonly
   *
   * @description
   * Utility classes applied to the floating drag preview (the clone that follows
   * the pointer), lifting it with a shadow and brand ring so the card being moved
   * reads as picked up. Passed as an array because the CDK adds each entry as a
   * separate class token.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {string[]}
   */
  protected readonly dragPreviewClass: string[] = ['shadow-2xl', 'ring-2', 'ring-primary-500/50'];

  /**
   * Property activeDropColumnId
   * @readonly
   *
   * @description
   * Identifier of the lane a card is currently hovering during a drag, or `null`
   * when no drag is in progress. Drives the active-lane highlight; only lanes that
   * accept the card (per the enter predicate) ever become active.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly activeDropColumnId: WritableSignal<string | null> = signal<string | null>(
    null,
  );
  //#endregion

  //#region Content templates
  /**
   * Property cardTemplate
   * @readonly
   *
   * @description
   * Card body template projected as `<ng-template #card let-card>`. Receives the
   * current card through {@link KanbanCardContext}; the board falls back to the
   * card identifier when absent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<KanbanCardContext> | undefined>}
   */
  protected readonly cardTemplate: Signal<TemplateRef<KanbanCardContext> | undefined> =
    contentChild<TemplateRef<KanbanCardContext>>('card');
  //#endregion

  //#region Outputs
  /**
   * Property cardDropped
   * @readonly
   *
   * @description
   * Emits when a card is dropped into a different lane and the drop is allowed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<KanbanDropEvent>}
   */
  public readonly cardDropped: OutputEmitterRef<KanbanDropEvent> = output<KanbanDropEvent>();
  //#endregion

  //#region Methods
  /**
   * Property enterPredicate
   * @readonly
   *
   * @description
   * CDK drop-list predicate delegating to {@link canDrop} for the lane behind the
   * drop list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(drag: CdkDrag, drop: CdkDropList) => boolean}
   */
  protected readonly enterPredicate = (drag: CdkDrag, drop: CdkDropList): boolean =>
    this.canDrop()(drag.data as KanbanCard, (drop.data as KanbanColumn).id);

  /**
   * Method onDrop
   * @method onDrop
   *
   * @description
   * Emits a {@link KanbanDropEvent} for an allowed cross-lane drop. Same-lane
   * drops are ignored.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDragDrop<KanbanColumn>} event - CDK drop event.
   *
   * @returns {void}
   */
  protected onDrop(event: CdkDragDrop<KanbanColumn>): void {
    this.activeDropColumnId.set(null);
    if (event.previousContainer === event.container) return;

    const card = event.item.data as KanbanCard;
    const toColumn: KanbanColumn = event.container.data;
    const fromColumn: KanbanColumn = event.previousContainer.data;
    if (!this.canDrop()(card, toColumn.id)) return;

    this.cardDropped.emit({ card, fromColumnId: fromColumn.id, toColumnId: toColumn.id });
  }

  /**
   * Method onListEntered
   * @method onListEntered
   *
   * @description
   * Marks a lane as the active drop target when a dragged card enters it. The CDK
   * only fires this for lanes whose enter predicate accepts the card, so the
   * highlight implicitly signals a legal drop.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} columnId - Identifier of the entered lane.
   *
   * @returns {void}
   */
  protected onListEntered(columnId: string): void {
    this.activeDropColumnId.set(columnId);
  }

  /**
   * Method onListExited
   * @method onListExited
   *
   * @description
   * Clears the active-lane highlight when the card leaves the lane, unless another
   * lane has already claimed it.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} columnId - Identifier of the exited lane.
   *
   * @returns {void}
   */
  protected onListExited(columnId: string): void {
    if (this.activeDropColumnId() === columnId) this.activeDropColumnId.set(null);
  }
  //#endregion
}
