import type { NonConformityStatus } from '@features/organization/features/inspections/models';

/**
 * Type NonConformityStatusOption
 *
 * @description
 * Select option used to expose non-conformity status filters with the visual
 * metadata required by dashboard pickers.
 */
export type NonConformityStatusOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the non-conformity status option, e.g.
   * "Open", "In Progress", "Done", or "Waived".
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Internal value of the non-conformity status option,
   * corresponding to the NonConformityStatus enum.
   *
   * @type {NonConformityStatus}
   */
  readonly value: NonConformityStatus;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Icon name representing the non-conformity status, used
   * for visual cues in the UI, e.g. "exclamation_circle" for open,
   * "spinner" for in progress, "check_circle" for done, or "minus_circle" for waived.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Hex color code associated with the non-conformity status, used
   * for consistent color-coding in the dashboard UI, e.g. red for open,
   * orange for in progress, green for done, or gray for waived.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
};