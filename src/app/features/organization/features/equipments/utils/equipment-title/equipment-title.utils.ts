import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';

/**
 * Function buildEquipmentTitle
 *
 * @description
 * Builds a stable, human-readable equipment title from its type, brand and
 * model — the localized type label, not the raw enum, so the document
 * title and the detail page header read the same as the type filter and
 * the type column.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {EquipmentOutput} equipment - The equipment to name.
 *
 * @returns {string} The composed title, e.g. "Fire extinguisher — Kidde Pro 210".
 */
export function buildEquipmentTitle(equipment: EquipmentOutput): string {
  const typeLabel: string =
    EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === equipment.type)?.label ??
    equipment.type;
  const brandModel: string = [equipment.brand, equipment.model].filter(Boolean).join(' ');

  return brandModel ? `${typeLabel} — ${brandModel}` : typeLabel;
}
