import type { FacilityOutput } from './facility-output.interface';

/**
 * Type FacilityWritableFields
 *
 * @description
 * Contains facility fields accepted by create and update operations.
 *
 * @type FacilityWritableFields
 */
type FacilityWritableFields = Pick<
  FacilityOutput,
  | 'type'
  | 'name'
  | 'parentFacilityId'
  | 'code'
  | 'address'
  | 'metadata'
  | 'latitude'
  | 'longitude'
  | 'levelIndex'
>;

/**
 * Type CreateFacilityInput
 *
 * @description
 * Payload used to create a facility within an
 * organization.
 *
 * @type
 */
export type CreateFacilityInput = Pick<FacilityWritableFields, 'type' | 'name'> &
  Partial<Omit<FacilityWritableFields, 'type' | 'name'>> & {
    /**
     * Property clientId
     * @readonly
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
     * @access public
     *
     * @type {string}
     */
    readonly organization?: string;

    /**
     * Property intervention
     * @readonly
     *
     * @access public
     *
     * @type {string}
     */
    readonly intervention?: string;
  };
