import type { KanbanCard } from './kanban-card.interface';

/**
 * Interface KanbanDropEvent
 *
 * @description
 * Emitted when a card is dropped into a different lane than its origin. Carries
 * the moved card and the source and target lane identifiers so the consumer can
 * apply its own transition. Same-lane drops do not emit.
 *
 * @since 1.0.0
 */
export interface KanbanDropEvent {
  /** Card that was moved. */
  readonly card: KanbanCard;

  /** Identifier of the lane the card came from. */
  readonly fromColumnId: string;

  /** Identifier of the lane the card was dropped into. */
  readonly toColumnId: string;
}
