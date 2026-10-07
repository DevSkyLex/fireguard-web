import type { EquipmentOutput } from './equipment-output.interface';

/**
 * Type EquipmentEditableFields
 *
 * @description
 * Contains equipment fields that may be changed by create or update operations.
 *
 * @type EquipmentEditableFields
 */
type EquipmentEditableFields = Pick<
  EquipmentOutput,
  | 'type'
  | 'subType'
  | 'brand'
  | 'model'
  | 'serialNumber'
  | 'locationLabel'
  | 'name'
  | 'assetCode'
  | 'criticality'
  | 'technicalProperties'
>;

/**
 * Type CreateEquipmentInput
 *
 * @description
 * Payload used to create an equipment resource
 * within an organization.
 *
 * @type
 */
export type CreateEquipmentInput = Pick<EquipmentEditableFields, 'type'> &
  Partial<Omit<EquipmentEditableFields, 'type'>> & {
    /**
     * Property clientId
     * @readonly
     *
     * @description
     * idempotent creation semantics.
     *
     * @access public
     *
     * @type {string}
     */
    readonly clientId?: string;

    /**
     * Property organization
     * @readonly
     *
     * @description
     * by route context but kept explicit for intervention workflows.
     *
     * @access public
     *
     * @type {string}
     */
    readonly organization?: string;

    /**
     * Property intervention
     * @readonly
     *
     * @description
     * field intervention flow.
     *
     * @access public
     *
     * @type {string}
     */
    readonly intervention?: string;

    /**
     * Property facility
     * @readonly
     *
     * @description
     *
     * @access public
     *
     * @type {string}
     */
    readonly facility?: string;
  };
