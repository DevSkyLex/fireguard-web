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
  readonly name?: string;
  readonly status?: InterventionStatus;
  readonly site?: string | null;
  readonly responsible?: string | null;
  readonly participants?: readonly string[];
  readonly priority?: InterventionPriority;
  readonly plannedStartAt?: Date | null;
  readonly dueAt?: Date | null;
  readonly reviewNote?: string | null;
  readonly description?: string | null;
  readonly labelIds?: readonly string[];
}
