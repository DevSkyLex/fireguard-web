import type { FacilityModelBinding } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityModelSettingsDraft
 * @interface FacilityModelSettingsDraft
 *
 * @description
 * Retains editable numeric text and source-node bindings across recoverable write conflicts.
 */
export interface FacilityModelSettingsDraft {
  /**
   * Property scale
   * @readonly
   *
   * @description
   * Uniform positive scale.
   *
   * @type {string}
   */
  readonly scale: string;

  /**
   * Property rotationDegrees
   * @readonly
   *
   * @description
   * Vertical-axis angle in degrees.
   *
   * @type {string}
   */
  readonly rotationDegrees: string;

  /**
   * Property x
   * @readonly
   *
   * @description
   * Horizontal translation in metres.
   *
   * @type {string}
   */
  readonly x: string;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Vertical translation in metres.
   *
   * @type {string}
   */
  readonly y: string;

  /**
   * Property z
   * @readonly
   *
   * @description
   * Horizontal depth translation in metres.
   *
   * @type {string}
   */
  readonly z: string;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Facility association for the selected source node.
   *
   * @type {string}
   */
  readonly facilityId: string;

  /**
   * Property bindings
   * @readonly
   *
   * @description
   * Editable node associations, preserving immutable indices.
   *
   * @type {readonly FacilityModelBinding[]}
   */
  readonly bindings: readonly FacilityModelBinding[];

  /**
   * Property removedBindingNodeIndices
   * @readonly
   *
   * @description
   * Explicitly removed associations, including nodes whose unavailable targets are masked.
   *
   * @type {readonly number[]}
   */
  readonly removedBindingNodeIndices: readonly number[];
}
