/**
 * Interface InspectionFilterOption
 * @interface InspectionFilterOption
 *
 * @description
 * Visual configuration used to render inspection result/status badges and
 * their matching filter options with the same icon and color.
 *
 * @template TValue - API enum value represented by the option.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InspectionFilterOption<TValue extends string = string> {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label displayed in the table and filters.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * API enum value forwarded in list filters.
   *
   * @type {TValue}
   */
  readonly value: TValue;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcon class rendered next to the label.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Accent color applied to the option icon.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
}
