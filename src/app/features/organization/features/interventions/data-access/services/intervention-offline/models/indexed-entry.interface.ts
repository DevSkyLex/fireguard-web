/**
 * Key/value pair written in a single IndexedDB transaction.
 */
export interface IndexedEntry<T> {
  readonly key: string;
  readonly value: T;
}
