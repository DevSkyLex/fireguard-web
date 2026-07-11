import type { BoardColumn } from '../../board';

/**
 * Type GroupedListHeaderContext
 *
 * @description
 * Template context handed to a template marked `[appGroupedListHeader]`. The
 * group is exposed as the implicit value, bound through `let-group`,
 * alongside its item count as a named variable.
 *
 * @since 1.0.0
 */
export type GroupedListHeaderContext<T> = {
  /** Group rendered by this header, bound through `let-group`. */
  readonly $implicit: BoardColumn<T>;

  /** Convenience alias for `$implicit.items.length`, bound through `let-count="count"`. */
  readonly count: number;
};
