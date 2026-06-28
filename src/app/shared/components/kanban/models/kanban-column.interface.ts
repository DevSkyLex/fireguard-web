import type { KanbanCard } from './kanban-card.interface';

/**
 * Interface KanbanColumn
 *
 * @description
 * A single board lane: an identifier, a header (label, optional icon, optional
 * accent color), the cards it holds, and an optional explicit `count` for the
 * header badge when the lane shows a bounded page of a larger total.
 * Domain-agnostic — lane semantics, ordering and accent color are decided by the
 * consumer.
 *
 * @since 1.0.0
 */
export interface KanbanColumn {
  /** Stable lane identifier, surfaced on drop events. */
  readonly id: string;

  /** Header label. */
  readonly label: string;

  /** Optional header icon class. */
  readonly icon?: string;

  /** Optional badge count; defaults to the number of cards when absent. */
  readonly count?: number;

  /**
   * Optional Tailwind background-color class(es) for the lane's accent
   * separator, rendered as a thin rounded bar under the header (e.g.
   * `'bg-blue-500 dark:bg-blue-400'`). No separator is rendered when absent.
   */
  readonly accentClass?: string;

  /** Cards held by the lane, in display order. */
  readonly cards: readonly KanbanCard[];
}
