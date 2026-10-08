/**
 * Type OnboardingEquipmentTypeOption
 *
 * @description
 * Permanent equipment code received through the organization setup catalogue,
 * including organization-defined types and previously prepared historical codes.
 *
 * @since 1.0.0
 *
 * @type {OnboardingEquipmentTypeOption}
 */
export type OnboardingEquipmentTypeOption = string;

/**
 * Interface OnboardingEquipmentFormDraft
 * @interface OnboardingEquipmentFormDraft
 *
 * @description
 * The Signal Forms model the `create_first_equipment` step edits. `type`
 * starts blank so the required rule has something to reject; the rest is
 * free text with no backend enum of its own.
 *
 * @since 1.0.0
 */
export interface OnboardingEquipmentFormDraft {
  /**
   * Property type
   * @readonly
   *
   * @description
   * Server-owned equipment code, or an empty string until one is picked.
   *
   * @type {OnboardingEquipmentTypeOption | ''}
   */
  readonly type: OnboardingEquipmentTypeOption | '';

  /**
   * Property brand
   * @readonly
   *
   * @description
   * Manufacturer brand retained in the editable draft.
   *
   * @type {string}
   */
  readonly brand: string;

  /**
   * Property model
   * @readonly
   *
   * @description
   * Manufacturer model reference retained in the editable draft.
   *
   * @type {string}
   */
  readonly model: string;

  /**
   * Property serialNumber
   * @readonly
   *
   * @description
   * Manufacturer serial number retained in the editable draft.
   *
   * @type {string}
   */
  readonly serialNumber: string;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Target site's identity, or an empty string when none is attached.
   *
   * @type {string}
   */
  readonly facilityId: string;
}
