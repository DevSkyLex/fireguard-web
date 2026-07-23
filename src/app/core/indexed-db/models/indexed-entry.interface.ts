/**
 * Interface IndexedEntry
 * @interface IndexedEntry
 *
 * @description
 * Key/value pair written in a single IndexedDB transaction.
 *
 * The key is explicit because every store in this app is created without a
 * `keyPath` — records are plain values with out-of-line keys.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface IndexedEntry<T> {
  readonly key: string;
  readonly value: T;
}
