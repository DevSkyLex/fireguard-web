import type { InspectionStatus } from '@features/organization/features/inspections/models';

/**
 * Type InspectionStatusOption
 *
 * @description
 * Select option used to expose inspection status filters with the UI metadata
 * required by dashboard controls.
 */
export type InspectionStatusOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the inspection status option, e.g.
   * "Scheduled", "In Progress", or "Completed". This is the text
   * shown to users in the dashboard filter controls.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Internal value of the inspection status option, corresponding to the
   * InspectionStatus type.
   *
   * @type {InspectionStatus}
   */
  readonly value: InspectionStatus;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Icon name representing the inspection status, used for visual cues in the UI,
   * e.g. "calendar" for scheduled, "spinner" for in progress, or
   * "check_circle" for completed inspections.
   *
   * This enhances the user experience by providing
   * intuitive visual representations of each status.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Hex color code associated with the inspection status,
   * used for consistent color-coding in the dashboard UI, e.g.
   * blue for scheduled, orange for in progress, or green for
   * completed inspections.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
};
