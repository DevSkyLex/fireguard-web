import type { InterventionChangeOutput } from '../intervention-change/intervention-change-output.interface';
import type { InterventionWorkItemOutput } from '../intervention-work-item/intervention-work-item-output.interface';

/**
 * Interface InterventionCollectionsChange
 * @interface InterventionCollectionsChange
 *
 * @description
 * Context-bound consequences of a successful remote, queued or replayed mutation.
 *
 * @since 6.2.0
 */
export interface InterventionCollectionsChange {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property source
   * @readonly
   *
   * @description
   * Identifies the source that added this intervention collections change.
   *
   * @access public
   *
   * @type {'remote' | 'queued' | 'replayed'}
   */
  readonly source: 'remote' | 'queued' | 'replayed';

  /**
   * Property collections
   * @readonly
   *
   * @description
   * Names the intervention collections changed by this update.
   *
   * @access public
   *
   * @type {readonly (
   *   | 'workItems'
   *   | 'changes'
   *   | 'facilities'
   *   | 'equipment'
   *   | 'inspections'
   *   | 'activity'
   *   | 'attachments'
   * )[]}
   */
  readonly collections: readonly (
    | 'workItems'
    | 'changes'
    | 'facilities'
    | 'equipment'
    | 'inspections'
    | 'activity'
    | 'attachments'
  )[];

  /**
   * Property workItem
   * @readonly
   *
   * @description
   * Contains the work item targeted by this operation, when one is available.
   *
   * @access public
   *
   * @type {InterventionWorkItemOutput}
   */
  readonly workItem?: InterventionWorkItemOutput;

  /**
   * Property change
   * @readonly
   *
   * @description
   * Contains the intervention change created or updated by this operation.
   *
   * @access public
   *
   * @type {InterventionChangeOutput}
   */
  readonly change?: InterventionChangeOutput;

  /**
   * Property deletedWorkItemIds
   * @readonly
   *
   * @description
   * Lists work-item ids removed by this collection update.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly deletedWorkItemIds?: readonly string[];
}
