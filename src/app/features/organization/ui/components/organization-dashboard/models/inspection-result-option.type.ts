import type { InspectionResult } from '@features/organization/features/inspections/models';

/**
 * Type InspectionResultOption
 *
 * @description
 * Select option used to expose inspection result filters with their display
 * icon and color metadata.
 */
export type InspectionResultOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the inspection result option, e.g.
   * "Pass", "Fail", or "Partial".
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Internal value of the inspection result option, corresponding to the
   * InspectionResult type.
   *
   * @type {InspectionResult}
   */
  readonly value: InspectionResult;


  /**
   * Property icon
   * @readonly
   *
   * @description
   * Icon name representing the inspection result, used for visual cues in the UI,
   * e.g. "check_circle" for pass, "times_circle" for fail,
   * or "exclamation_circle" for partial results.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Hex color code associated with the inspection result,
   * used for consistent color-coding in the dashboard UI, e.g.
   * green for pass, red for fail, or orange for partial results.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
};
