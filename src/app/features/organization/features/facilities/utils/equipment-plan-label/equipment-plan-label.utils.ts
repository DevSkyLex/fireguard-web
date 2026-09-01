import type { EquipmentType } from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';

/**
 * Function equipmentPlanLabel
 * @function equipmentPlanLabel
 *
 * @description
 * Names an equipment item pinned on a floor plan, the way an operator would.
 *
 * Equipment carries no name field, so something has to be composed. The
 * backend used to do it and sent `"gas_detector (SEED-GAS-003)"` — a raw enum
 * a client can only print as-is, in English, underscore included. The parts
 * now travel separately and the label is built here, where the translated
 * type catalogue lives.
 *
 * The location label wins when there is one: "Server room — rack row A" tells
 * someone standing in the building far more than a type does. The type is the
 * fallback, and the serial number never leads — it identifies the item for a
 * technician, it does not describe it.
 *
 * @since 1.0.0
 *
 * @param {object} equipment - The pinned item's identity, in parts.
 * @param {EquipmentType | string} equipment.type - The raw enum value. Widened to `string` because `EquipmentOutput` types it that way; an unknown value falls through to itself rather than throwing.
 * @param {string | null} equipment.serialNumber - Its serial number, if any.
 * @param {string | null} equipment.locationLabel - Where it sits, if recorded.
 *
 * @returns {string} A label safe to render to a user.
 */
export function equipmentPlanLabel(equipment: {
  readonly type: EquipmentType | string;
  readonly serialNumber: string | null;
  readonly locationLabel: string | null;
}): string {
  const location: string = equipment.locationLabel?.trim() ?? '';
  const typeLabel: string =
    EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === equipment.type)?.label ??
    equipment.type;

  return location === '' ? typeLabel : location;
}

/**
 * Function equipmentPlanDetail
 * @function equipmentPlanDetail
 *
 * @description
 * The secondary line under {@link equipmentPlanLabel} — the type when the
 * label already used the location, and the serial number when there is one.
 * Returns an empty string rather than a placeholder, so a caller can drop the
 * line entirely instead of rendering a dash.
 *
 * @since 1.0.0
 *
 * @param {object} equipment - The pinned item's identity, in parts.
 * @param {EquipmentType | string} equipment.type - The raw enum value. Widened to `string` because `EquipmentOutput` types it that way; an unknown value falls through to itself rather than throwing.
 * @param {string | null} equipment.serialNumber - Its serial number, if any.
 * @param {string | null} equipment.locationLabel - Where it sits, if recorded.
 *
 * @returns {string} The secondary line, or an empty string when there is nothing to add.
 */
export function equipmentPlanDetail(equipment: {
  readonly type: EquipmentType | string;
  readonly serialNumber: string | null;
  readonly locationLabel: string | null;
}): string {
  const typeLabel: string =
    EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === equipment.type)?.label ??
    equipment.type;
  const serial: string = equipment.serialNumber?.trim() ?? '';
  const usedLocation: boolean = (equipment.locationLabel?.trim() ?? '') !== '';

  const parts: string[] = [];
  if (usedLocation) parts.push(typeLabel);
  if (serial !== '') parts.push(serial);

  return parts.join(' · ');
}
