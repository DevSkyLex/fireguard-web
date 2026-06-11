/**
 * Interface NotificationCategoryColor
 * @interface NotificationCategoryColor
 *
 * @description
 * Tailwind color classes used to render a notification category icon.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotificationCategoryColor {
  //#region Properties
  /**
   * Property background
   * @readonly
   *
   * @description
   * Background color classes applied to the icon avatar.
   *
   * @type {string}
   */
  readonly background: string;

  /**
   * Property text
   * @readonly
   *
   * @description
   * Text color classes applied to the icon avatar.
   *
   * @type {string}
   */
  readonly text: string;
  //#endregion
}
