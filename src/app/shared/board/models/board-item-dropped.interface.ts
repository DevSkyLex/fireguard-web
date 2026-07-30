/**
 * Interface BoardItemDropped
 *
 * @description
 * Payload emitted by {@link Board}'s `itemDropped` output when an item is
 * moved into a different column. The board never mutates its `columns`
 * input — the parent store applies the move and re-renders.
 *
 * @since 1.0.0
 */
export interface BoardItemDropped<T> {
  /** Item that was moved. */
  readonly item: T;

  /** Id of the column the item was dragged out of. */
  readonly fromColumnId: string;

  /** Id of the column the item was dropped into. */
  readonly toColumnId: string;
}
