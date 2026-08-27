/**
 * Interface AccountNotificationPreferenceRow
 * @interface AccountNotificationPreferenceRow
 *
 * @description
 * One row of the category × channel matrix: a notification category with its
 * effective delivery flags — the server's explicit customization when one
 * exists, both channels enabled otherwise.
 *
 * @since 1.0.0
 */
export interface AccountNotificationPreferenceRow {
  /**
   * Property category
   * @readonly
   *
   * @description
   * The raw category identifier, byte-for-byte what the API names.
   *
   * @type {string}
   */
  readonly category: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * The human-readable category label rendered in the matrix.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property emailEnabled
   * @readonly
   *
   * @description
   * Whether email delivery is effectively enabled for this category.
   *
   * @type {boolean}
   */
  readonly emailEnabled: boolean;

  /**
   * Property mercureEnabled
   * @readonly
   *
   * @description
   * Whether in-app (Mercure) delivery is effectively enabled for this
   * category.
   *
   * @type {boolean}
   */
  readonly mercureEnabled: boolean;
}

/**
 * Interface AccountNotificationPreferenceToggle
 * @interface AccountNotificationPreferenceToggle
 *
 * @description
 * The complete row values after one switch flipped — both channel flags are
 * carried because an upsert always writes a complete row.
 *
 * @since 1.0.0
 */
export interface AccountNotificationPreferenceToggle {
  /**
   * Property category
   * @readonly
   *
   * @description
   * The category whose row changed.
   *
   * @type {string}
   */
  readonly category: string;

  /**
   * Property emailEnabled
   * @readonly
   *
   * @description
   * The email flag after the toggle.
   *
   * @type {boolean}
   */
  readonly emailEnabled: boolean;

  /**
   * Property mercureEnabled
   * @readonly
   *
   * @description
   * The in-app (Mercure) flag after the toggle.
   *
   * @type {boolean}
   */
  readonly mercureEnabled: boolean;
}
