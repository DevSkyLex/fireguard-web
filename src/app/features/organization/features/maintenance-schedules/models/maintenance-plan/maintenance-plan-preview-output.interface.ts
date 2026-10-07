/**
 * Interface MaintenancePlanPreviewOutput
 * @interface MaintenancePlanPreviewOutput
 *
 * @description
 * Backend-calculated dates; the browser never implements calendar recurrence.
 */
export interface MaintenancePlanPreviewOutput {
  /**
   * Property dates
   * @readonly
   *
   * @description
   * Next three calendar deadlines, when configured.
   *
   * @since unreleased
   *
   * @type {readonly string[]}
   */
  readonly dates: readonly string[];
}
