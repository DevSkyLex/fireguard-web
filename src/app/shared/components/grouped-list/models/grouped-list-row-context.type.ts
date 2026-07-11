/**
 * Type GroupedListRowContext
 *
 * @description
 * Template context handed to a template marked `[appGroupedListRow]`. The
 * item is exposed as the implicit value, bound through `let-item`.
 *
 * @since 1.0.0
 */
export type GroupedListRowContext<T> = {
  /** Item rendered by this row, bound through `let-item`. */
  readonly $implicit: T;
};
