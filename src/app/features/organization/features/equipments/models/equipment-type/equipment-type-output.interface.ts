import type { HydraItem } from '@core/api/models';

/**
 * Type EquipmentFamily
 *
 * @description
 * Server-owned family used to scope the fire inventory.
 *
 * @type {EquipmentFamily}
 */
export type EquipmentFamily = 'fire' | 'safety' | 'other';

/**
 * Interface EquipmentTypeOutput
 * @interface EquipmentTypeOutput
 *
 * @description
 * Organization-owned catalog entry returned by the server.
 */
export interface EquipmentTypeOutput extends HydraItem {
  /**
   * Property value
   *
   * @description
   * Stable equipment type code.
   */
  readonly value: string;

  /**
   * Property label
   *
   * @description
   * Catalog display label.
   */
  readonly label: string;

  /**
   * Property family
   *
   * @description
   * Inventory family assigned to this type.
   */
  readonly family: EquipmentFamily;

  /**
   * Property archived
   *
   * @description
   * Archived types remain readable but cannot be newly assigned.
   */
  readonly archived: boolean;

  /**
   * Property revision
   *
   * @description
   * Optimistic concurrency revision of the catalog entry.
   */
  readonly revision: number;
}

/**
 * Interface EquipmentTypeOption
 * @interface EquipmentTypeOption
 *
 * @description
 * Type picker option derived from the organization catalog.
 */
export interface EquipmentTypeOption extends EquipmentTypeOutput {
  /**
   * Property icon
   *
   * @description
   * Registered Lucide icon, with a safe fallback for custom codes.
   */
  readonly icon: string;
}
