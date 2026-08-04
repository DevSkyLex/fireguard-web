import type { InspectorType } from '@features/organization/features/inspections/models';

/**
 * Type InspectorTypeOption
 *
 * @description
 * Select option used to expose inspector origin
 * filters in dashboard views.
 */
export type InspectorTypeOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the inspector type option, e.g. "Internal"
   * or "External".
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Internal value of the inspector type option, corresponding to the
   * InspectorType type.
   *
   * @type {InspectorType}
   */
  readonly value: InspectorType;
  //#endregion
};
