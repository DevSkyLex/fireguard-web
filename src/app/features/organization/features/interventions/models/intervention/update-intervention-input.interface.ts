import type { InterventionPriority } from './intervention-priority.type';
import type { InterventionStatus } from './intervention-status.type';

/**
 * Interface UpdateInterventionInput
 * @interface UpdateInterventionInput
 *
 * @description
 * Merge-patch input: omitted fields remain unchanged, while `labelIds` replaces
 * the entire label set rather than adding to it.
 *
 * @version 1.0.0
 */
export interface UpdateInterventionInput {
  /**
   * Property workloadConfirmationToken
   * @readonly
   *
   * @description
   * Explicit confirmation bound to a current planning assessment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workloadConfirmationToken?: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this update intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name?: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this update intervention.
   *
   * @access public
   *
   * @type {InterventionStatus}
   */
  readonly status?: InterventionStatus;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Names the work site associated with this intervention.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly site?: string | null;

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * Identifies the member assigned responsibility for this intervention.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly responsible?: string | null;

  /**
   * Property participants
   * @readonly
   *
   * @description
   * Lists organization members participating in this intervention.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly participants?: readonly string[];

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Selects the operational priority of this intervention.
   *
   * @access public
   *
   * @type {InterventionPriority}
   */
  readonly priority?: InterventionPriority;

  /**
   * Property plannedStartAt
   * @readonly
   *
   * @description
   * Records when planned start occurs for this update intervention.
   *
   * @access public
   *
   * @type {Date | null}
   */
  readonly plannedStartAt?: Date | null;

  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Records when due occurs for this update intervention.
   *
   * @access public
   *
   * @type {Date | null}
   */
  readonly dueAt?: Date | null;

  /**
   * Property reviewNote
   * @readonly
   *
   * @description
   * Contains the reviewer note attached to this transition.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly reviewNote?: string | null;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Provides descriptive text entered for this record.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly description?: string | null;

  /**
   * Property labelIds
   * @readonly
   *
   * @description
   * Lists the labels assigned to this intervention.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly labelIds?: readonly string[];
}
