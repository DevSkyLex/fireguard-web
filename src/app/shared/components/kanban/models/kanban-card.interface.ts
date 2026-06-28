/**
 * Interface KanbanCard
 *
 * @description
 * A single draggable card on the board. Domain-agnostic: it carries only the
 * stable identifier the board needs to track and drag it, plus an opaque `data`
 * payload that lets a consumer round-trip its own model through the card
 * template and drop events without the board knowing its shape.
 *
 * @since 1.0.0
 */
export interface KanbanCard {
  /** Stable unique identifier, used for tracking and drag data. */
  readonly id: string;

  /** Opaque consumer payload echoed back through the card template and drops. */
  readonly data?: unknown;
}
