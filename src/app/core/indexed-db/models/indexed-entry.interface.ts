/**
 * Interface IndexedEntry
 * @interface IndexedEntry
 *
 * @description
 * Key/value pair written in a single IndexedDB transaction.
 * The key is explicit because every store in this app is created without a
 * `keyPath` — records are plain values with out-of-line keys.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface IndexedEntry<T> {
  /**
   * Property key
   * @readonly
   *
   * @description
   * Out-of-line IndexedDB key used because this application creates stores without a `keyPath`.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Record value written under the corresponding IndexedDB key in the same transaction.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {T}
   */
  readonly value: T;
}
