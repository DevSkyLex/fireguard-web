import type { OrganizationDashboardEquipmentType } from '@features/organization/models';

/**
 * Type EquipmentTypeOption
 *
 * @description
 * Select option used to expose dashboard equipment
 * type filters in the UI.
 */
export type EquipmentTypeOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the equipment type option, e.g. "Fire Extinguisher" or "Smoke Detector".
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
   * Internal value of the equipment type option,
   * corresponding to the OrganizationDashboardEquipmentType type.
   *
   * @type {OrganizationDashboardEquipmentType}
   */
  readonly value: OrganizationDashboardEquipmentType;
  //#endregion
};
