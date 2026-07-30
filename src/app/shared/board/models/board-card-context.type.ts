/**
 * Type BoardCardContext
 *
 * @description
 * Template context handed to a template marked `[appBoardCard]`. The item is
 * exposed as the implicit value, bound through `let-item` in the consumer
 * template.
 *
 * @since 1.0.0
 */
export type BoardCardContext<T> = {
  /** Item rendered by this card, bound through `let-item`. */
  readonly $implicit: T;
};
