/**
 * Interface EquipmentLabelsDraft
 * @interface EquipmentLabelsDraft
 *
 * @description
 * Editable scope of one QR label export, defaulting to an empty explicit selection.
 */
export interface EquipmentLabelsDraft {
  /**
   * Property mode
   *
   * @description
   * Explicit target mode.
   */
  readonly mode: 'inventory' | 'facility' | 'selection';
  /**
   * Property facilityId
   *
   * @description
   * Chosen site identity.
   */
  readonly facilityId: string;
  /**
   * Property ids
   *
   * @description
   * Explicit checked equipment identities.
   */
  readonly ids: readonly string[];
}
