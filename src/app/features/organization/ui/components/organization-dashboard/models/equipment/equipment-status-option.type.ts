import type { OrganizationDashboardEquipmentStatus } from '@features/organization/models';

/**
 * Type EquipmentStatusOption
 *
 * @description
 * Select option used to expose dashboard equipment status filters, including
 * the visual metadata required by the picker.
 */
export type EquipmentStatusOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the equipment status option, e.g. "Operational" or "Under Maintenance".
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
   * Internal value of the equipment status option,
   * corresponding to the OrganizationDashboardEquipmentStatus type.
   *
   * @type {OrganizationDashboardEquipmentStatus}
   */
  readonly value: OrganizationDashboardEquipmentStatus;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Icon name representing the equipment status,
   * used for visual cues in the UI, e.g. "check_circle"
   * for operational or "wrench" for under maintenance.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Hex color code associated with the equipment status, used for consistent
   * color-coding in the dashboard UI, e.g. green for operational or orange for under maintenance.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
};