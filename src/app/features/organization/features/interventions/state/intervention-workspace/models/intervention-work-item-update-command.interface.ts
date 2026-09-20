import type {
  InterventionWorkItemOutput,
  UpdateInterventionWorkItemInput,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionWorkItemUpdateCommand
 * @interface InterventionWorkItemUpdateCommand
 *
 * @description
 * Explicit planning or remaining-effort edit against a captured task revision.
 *
 * @since 1.0.0
 */
export interface InterventionWorkItemUpdateCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Owning workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property item
   * @readonly
   *
   * @description
   * Snapshot reviewed by the operator.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InterventionWorkItemOutput}
   */
  readonly item: InterventionWorkItemOutput;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Explicit fields only.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {UpdateInterventionWorkItemInput}
   */
  readonly input: UpdateInterventionWorkItemInput;
}
