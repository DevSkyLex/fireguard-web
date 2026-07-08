import type { EquipmentStatus } from '@features/organization/features/equipments/models';
import type { TagOption } from '@shared/components';

/**
 * Type EquipmentStatusOption
 * @typedef EquipmentStatusOption
 *
 * @description
 * Option rendered by the facility equipment status filter and badge — the
 * shared {@link TagOption} generic specialized to the equipment status enum.
 *
 * @since 1.0.0
 */
export type EquipmentStatusOption = TagOption<EquipmentStatus>;
