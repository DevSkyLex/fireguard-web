import type { InterventionStatus } from '@features/organization/features/interventions/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Interface InterventionStatusOption
 * @interface InterventionStatusOption
 *
 * @description
 * Display metadata used to render intervention status options consistently in
 * the intervention table status filter. Extends the shared {@link TagDescriptor}
 * (`label`, `severity`, `icon`) so it can be forwarded directly to `<app-tag>`,
 * and adds the API `value` sent in list filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionStatusOption extends TagDescriptor {
  //#region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Intervention status value sent by the API.
   *
   * @type {InterventionStatus}
   */
  readonly value: InterventionStatus;
  //#endregion
}
