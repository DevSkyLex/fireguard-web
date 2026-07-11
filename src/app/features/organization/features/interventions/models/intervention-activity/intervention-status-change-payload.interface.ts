import type { InterventionStatus } from '../intervention/intervention-status.type';

/**
 * Interface InterventionStatusChangePayload
 * @interface InterventionStatusChangePayload
 *
 * @description
 * Structured payload of a `status_changed` intervention activity.
 */
export interface InterventionStatusChangePayload {
  //#region Properties
  /**
   * Property from
   * @readonly
   *
   * @description
   * Status the intervention transitioned from.
   *
   * @type {InterventionStatus}
   */
  readonly from: InterventionStatus;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Status the intervention transitioned to.
   *
   * @type {InterventionStatus}
   */
  readonly to: InterventionStatus;
  //#endregion
}
