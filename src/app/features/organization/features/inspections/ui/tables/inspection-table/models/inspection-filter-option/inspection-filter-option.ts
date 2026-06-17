import type { TagDescriptor } from '@shared/components';

/**
 * Interface InspectionFilterOption
 * @interface InspectionFilterOption
 *
 * @description
 * Visual configuration used to render inspection result/status badges and
 * their matching filter options with the same icon and severity colour.
 * Extends the shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it
 * can be forwarded directly to `<app-tag>`, and adds the API enum `value`
 * forwarded in list filters.
 *
 * @template TValue - API enum value represented by the option.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InspectionFilterOption<TValue extends string = string> extends TagDescriptor {
  //#region Properties
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
  //#endregion
}
