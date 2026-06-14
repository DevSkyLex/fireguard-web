import type { EquipmentOutput } from './equipment-output.interface';

type EquipmentEditableFields = Pick<
  EquipmentOutput,
  'type' | 'subType' | 'brand' | 'model' | 'serialNumber' | 'locationLabel'
>;

/**
 * Type CreateEquipmentInput
 *
 * @description
 * Payload used to create an equipment resource
 * within an organization.
 */
export type CreateEquipmentInput = Pick<EquipmentEditableFields, 'type'> &
  Partial<Omit<EquipmentEditableFields, 'type'>> & {
    /**
     * Optional client-generated id used by offline-first replay to guarantee
     * idempotent creation semantics.
     */
    readonly clientId?: string;
    /**
     * Optional intervention-aware payload override. Usually populated server-side
     * by route context but kept explicit for intervention workflows.
     */
    readonly organization?: string;
    /**
     * Optional intervention IRI binding used when equipment is created inside a
     * field intervention flow.
     */
    readonly intervention?: string;
    /**
     * Optional facility IRI allowing direct assignment at creation time.
     */
    readonly facility?: string;
  };
