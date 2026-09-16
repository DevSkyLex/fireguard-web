import type {
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';

/**
 * Interface InterventionEquipmentTableQuery
 * @interface InterventionEquipmentTableQuery
 * @description Controlled criteria for linked equipment, retained in page state.
 * @since 6.2.0
 */
export interface InterventionEquipmentTableQuery {
  readonly search: string;
  readonly type: EquipmentType | null;
  readonly status: EquipmentStatus | null;
}
