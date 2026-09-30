import type { InspectionResult } from './inspection-output.interface';

/**
 * Interface UpdateInspectionInput
 * @interface
 *
 * @description
 * Fields the operator may change when updating an inspection.
 */
export interface UpdateInspectionInput {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Identifies the equipment associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly equipmentId?: string;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Identifies the facility associated with this event.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly facilityId?: string | null;

  /**
   * Property checklistId
   * @readonly
   *
   * @description
   * Identifies the checklist associated with this update inspection.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly checklistId?: string | null;

  /**
   * Property result
   * @readonly
   *
   * @description
   * Reports the outcome assigned to this inspection.
   *
   * @access public
   *
   * @type {InspectionResult}
   */
  readonly result?: InspectionResult;

  /**
   * Property performedAt
   * @readonly
   *
   * @description
   * Records when performed occurs for this update inspection.
   *
   * @access public
   *
   * @type {string}
   */
  readonly performedAt?: string;

  /**
   * Property notes
   * @readonly
   *
   * @description
   * Contains the inspection notes entered by the operator.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly notes?: string | null;

  /**
   * Property signature
   * @readonly
   *
   * @description
   * Contains the captured signature for this inspection.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly signature?: string | null;
}
