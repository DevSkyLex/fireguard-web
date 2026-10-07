import type { EquipmentOutput } from '@features/organization/features/equipments/models';

/**
 * Interface InterventionReplacementContext
 * @interface InterventionReplacementContext
 *
 * @description
 * Server equipment facts used to confirm a completed replacement without accepting free-form links.
 */
export interface InterventionReplacementContext {
  /**
   * Property original
   * @readonly
   *
   * @description
   * Equipment read through its organization-scoped resource.
   *
   * @access public
   *
   * @type {EquipmentOutput}
   */
  readonly original: EquipmentOutput;

  /**
   * Property successor
   * @readonly
   *
   * @description
   * Published successor with a verified reciprocal link, or null when confirmation is unavailable.
   *
   * @access public
   *
   * @type {EquipmentOutput | null}
   */
  readonly successor: EquipmentOutput | null;
}
