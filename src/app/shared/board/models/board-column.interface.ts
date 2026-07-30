/**
 * Interface BoardColumn
 *
 * @description
 * A single lane of the {@link Board}: a stable identifier and the items it
 * currently holds.
 *
 * @since 1.0.0
 */
export interface BoardColumn<T> {
  /** Stable identifier for the column, used for drag-drop routing and tracking. */
  readonly id: string;

  /** Items currently placed in this column, in display order. */
  readonly items: readonly T[];
}
