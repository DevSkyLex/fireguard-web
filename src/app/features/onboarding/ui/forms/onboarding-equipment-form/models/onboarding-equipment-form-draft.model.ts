import type { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';

/**
 * Type OnboardingEquipmentTypeOption
 *
 * @description
 * The equipment type values the onboarding step may pick, inferred from
 * {@link EQUIPMENT_TYPE_OPTIONS} rather than the equipments subfeature's own
 * `EquipmentType` model type — that type lives on a private path onboarding
 * may not import (`FEATURE.md` "Cross-Feature Dependencies").
 *
 * @since 1.0.0
 */
export type OnboardingEquipmentTypeOption = (typeof EQUIPMENT_TYPE_OPTIONS)[number]['value'];

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
  /** The equipment type, or an empty string until one is picked. */
  readonly type: OnboardingEquipmentTypeOption | '';

  /** Manufacturer brand. */
  readonly brand: string;

  /** Model reference. */
  readonly model: string;

  /** Manufacturer serial number. */
  readonly serialNumber: string;

  /** The target facility's id, or an empty string when none is attached. */
  readonly facilityId: string;
}
