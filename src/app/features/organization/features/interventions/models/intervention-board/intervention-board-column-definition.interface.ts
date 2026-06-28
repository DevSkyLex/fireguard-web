import type { InterventionStatus } from '../intervention/intervention-status.type';
import type { InterventionBoardColumnId } from './intervention-board-column-id.type';

/**
 * Interface InterventionBoardColumnDefinition
 *
 * @description
 * Structural definition of a pipeline-board lane: the workflow statuses it
 * groups, and the status a card adopts when dropped into the lane
 * (`dropTarget`). A `null` drop target marks a lane that cannot be reached by a
 * drag (the terminal `published` lane, reached only through the publication
 * flow). This is transport-agnostic structure; lane labels, icons and accents
 * are presentation owned by the dataview.
 *
 * @since 1.0.0
 */
export interface InterventionBoardColumnDefinition {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Lane identifier.
   *
   * @type {InterventionBoardColumnId}
   */
  readonly id: InterventionBoardColumnId;

  /**
   * Property statuses
   * @readonly
   *
   * @description
   * Workflow statuses grouped under the lane.
   *
   * @type {readonly InterventionStatus[]}
   */
  readonly statuses: readonly InterventionStatus[];

  /**
   * Property dropTarget
   * @readonly
   *
   * @description
   * Status a card adopts when dropped into the lane, or `null` when the lane is
   * not a valid drop target.
   *
   * @type {InterventionStatus | null}
   */
  readonly dropTarget: InterventionStatus | null;
}
