import type { KanbanColumn } from './kanban-column.interface';

/**
 * Type KanbanColumnContext
 *
 * @description
 * Template context handed to the projected lane-footer template. The board
 * exposes the current {@link KanbanColumn} as the implicit value, so a consumer
 * binds it with `let-column` in the projected `<ng-template #columnFooter>` and
 * renders a per-lane footer (for example a "Load more" affordance) from the
 * lane's `count` and loaded `cards`.
 *
 * @since 1.1.0
 */
export type KanbanColumnContext = {
  /** Current lane, bound through `let-column` in the consumer template. */
  readonly $implicit: KanbanColumn;
};
