import type {
  EquipmentTypeOption,
  EquipmentTypeOutput,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';

/**
 * Function equipmentTypeOption
 *
 * @description
 * Keeps the server's label and family while deriving the historical icon or a custom-type fallback.
 *
 * @param {EquipmentTypeOutput} type - Catalog entry returned by the server.
 *
 * @returns {EquipmentTypeOption} Display option preserving archived state.
 */
export function equipmentTypeOption(type: EquipmentTypeOutput): EquipmentTypeOption {
  const historical = EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === type.value);
  return {
    ...type,
    label: historical && type.revision === 1 ? historical.label : type.label,
    icon: historical?.icon ?? 'lucideBox',
  };
}
