import type {
  InterventionPhase,
  InterventionReadinessItem,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionCommandContext
 * @interface InterventionCommandContext
 *
 * @description
 * A read-only snapshot used to choose the detail workspace's single forward action.
 *
 * @access public
 */
export interface InterventionCommandContext {
  /**
   * Property phase
   * @readonly
   *
   * @description
   * The active workspace phase.
   *
   * @access public
   *
   * @type {InterventionPhase}
   */
  readonly phase: InterventionPhase;

  /**
   * Property status
   * @readonly
   *
   * @description
   * The current intervention status, or null while unavailable.
   *
   * @access public
   *
   * @type {InterventionStatus | null}
   */
  readonly status: InterventionStatus | null;

  /**
   * Property canPlan
   * @readonly
   *
   * @description
   * Whether the member may plan the current intervention.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canPlan: boolean;

  /**
   * Property canExecute
   * @readonly
   *
   * @description
   * Whether the member may perform field work.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canExecute: boolean;

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Whether the current backend capabilities allow submission.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canSubmit: boolean;

  /**
   * Property canPublish
   * @readonly
   *
   * @description
   * Whether the current backend capabilities allow publication.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canPublish: boolean;

  /**
   * Property readiness
   * @readonly
   *
   * @description
   * The planning checklist, including optional field work.
   *
   * @access public
   *
   * @type {readonly InterventionReadinessItem[]}
   */
  readonly readiness: readonly InterventionReadinessItem[];

  /**
   * Property transitionTarget
   * @readonly
   *
   * @description
   * The next forward transition selected from allowed transitions.
   *
   * @access public
   *
   * @type {InterventionStatus | null}
   */
  readonly transitionTarget: InterventionStatus | null;

  /**
   * Property workItemCount
   * @readonly
   *
   * @description
   * The number of recorded work items.
   *
   * @access public
   *
   * @type {number}
   */
  readonly workItemCount: number;

  /**
   * Property remainingWorkItems
   * @readonly
   *
   * @description
   * The number of unresolved work items.
   *
   * @access public
   *
   * @type {number}
   */
  readonly remainingWorkItems: number;

  /**
   * Property blockerCount
   * @readonly
   *
   * @description
   * The live count of publication blockers.
   *
   * @access public
   *
   * @type {number}
   */
  readonly blockerCount: number;

  /**
   * Property online
   * @readonly
   *
   * @description
   * Whether publication can reach the server.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly online: boolean;

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Whether the intervention has a write in progress.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly saving: boolean;

  /**
   * Property publishing
   * @readonly
   *
   * @description
   * Whether preparation or publication is in progress.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly publishing: boolean;
}
