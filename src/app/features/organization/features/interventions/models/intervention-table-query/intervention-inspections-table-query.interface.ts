import type {
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';

/**
 * Interface InterventionInspectionsTableQuery
 * @interface InterventionInspectionsTableQuery
 *
 * @description
 * Controlled criteria for linked inspections, retained in page state.
 *
 * @since 6.2.0
 */
export interface InterventionInspectionsTableQuery {
  /**
   * Property search
   * @readonly
   *
   * @description
   * Contains the text used to filter the linked-resource list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly search: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention inspections table.
   *
   * @access public
   *
   * @type {InspectionStatus | null}
   */
  readonly status: InspectionStatus | null;

  /**
   * Property result
   * @readonly
   *
   * @description
   * Reports the outcome assigned to this inspection.
   *
   * @access public
   *
   * @type {InspectionResult | null}
   */
  readonly result: InspectionResult | null;
}
