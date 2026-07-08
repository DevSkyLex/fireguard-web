import type { EquipmentStatus } from '@features/organization/features/equipments/models';
import type { TagOption } from '@shared/components';

/**
 * Type EquipmentStatusOption
 * @typedef EquipmentStatusOption
 *
 * @description
 * Visual configuration used to render and filter equipment lifecycle status
 * values across table badges and filter options — the shared {@link TagOption}
 * generic specialized to the equipment status enum.
 *
 * @since 1.0.0
 */
export type EquipmentStatusOption = TagOption<EquipmentStatus>;
