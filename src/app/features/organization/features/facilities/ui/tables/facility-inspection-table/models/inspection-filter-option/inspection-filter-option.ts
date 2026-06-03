/**
 * Interface InspectionFilterOption
 *
 * @description
 * Option rendered by facility inspection result and status filters.
 *
 * @template TValue Inspection filter value type.
 *
 * @since 1.0.0
 */
export interface InspectionFilterOption<TValue extends string> {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label displayed in the filter dropdown.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Inspection filter value sent to the inspection API.
   *
   * @type {TValue}
   */
  readonly value: TValue;
}
