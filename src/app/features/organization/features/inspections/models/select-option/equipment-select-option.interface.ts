import type { SelectOption } from './select-option.interface';

/**
 * Interface EquipmentSelectOption
 * @interface EquipmentSelectOption
 *
 * @description
 * One equipment as the inspection picker offers it: the serial number (or,
 * failing that, the localized type) as the label, the localized type on the
 * second line, and where it sits — location label and facility — as the
 * qualifier. Never a raw type key, never an id.
 *
 * @since 1.0.0
 */
export interface EquipmentSelectOption extends SelectOption {
  /** The localized equipment type ("Fire extinguisher"). */
  readonly typeLabel: string;

  /** "Location · Facility", or `null` when neither is known. */
  readonly secondary: string | null;
}
