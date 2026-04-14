import type { FacilityType } from '@features/organization/features/facilities/models';

/**
 * Type FacilityTypeOption
 *
 * @description
 * Select option used to expose dashboard
 * facility type filters.
 */
export type FacilityTypeOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the facility type option, e.g. "Warehouse" or "Office".
   * This is the text shown to users in the dashboard filter controls.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Internal value of the facility type option, corresponding
   * to the FacilityType type.
   *
   * @type {FacilityType}
   */
  readonly value: FacilityType;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Icon name representing the facility type, used
   * for visual cues in the UI, e.g. "building" for office
   * or "warehouse" for storage facilities.
   *
   * @type {string}
   */
  readonly icon: string;
  //#endregion
};
