import type { KanbanCard } from './kanban-card.interface';

/**
 * Type KanbanCardContext
 *
 * @description
 * Template context handed to the projected card template. The board exposes the
 * current {@link KanbanCard} as the implicit value, so a consumer binds it with
 * `let-card` in the projected `<ng-template>` and renders the card however it
 * likes — typically reading its own model back from `card.data`.
 *
 * @since 1.0.0
 */
export type KanbanCardContext = {
  /** Current card, bound through `let-card` in the consumer template. */
  readonly $implicit: KanbanCard;
};
