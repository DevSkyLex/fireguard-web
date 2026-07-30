import type { BoardColumn } from './board-column.interface';

/**
 * Type BoardColumnHeaderContext
 *
 * @description
 * Template context handed to a template marked `[appBoardColumnHeader]`. The
 * column is exposed as the implicit value so a consumer can bind it with
 * `let-column`, alongside its id and item count as named variables.
 *
 * @since 1.0.0
 */
export type BoardColumnHeaderContext<T> = {
  /** Column rendered by this header, bound through `let-column`. */
  readonly $implicit: BoardColumn<T>;

  /** Convenience alias for `$implicit.id`, bound through `let-columnId="columnId"`. */
  readonly columnId: string;

  /** Convenience alias for `$implicit.items.length`, bound through `let-count="count"`. */
  readonly count: number;
};
