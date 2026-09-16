import type { InterventionChangeOutput } from '../intervention-change/intervention-change-output.interface';
import type { InterventionWorkItemOutput } from '../intervention-work-item/intervention-work-item-output.interface';

/**
 * Interface InterventionCollectionsChange
 * @interface InterventionCollectionsChange
 * @description Context-bound consequences of a successful remote, queued or replayed mutation.
 * @since 6.2.0
 */
export interface InterventionCollectionsChange {
  readonly interventionId: string;
  readonly source: 'remote' | 'queued' | 'replayed';
  readonly collections: readonly (
    | 'workItems'
    | 'changes'
    | 'facilities'
    | 'equipment'
    | 'inspections'
    | 'activity'
    | 'attachments'
  )[];
  readonly workItem?: InterventionWorkItemOutput;
  readonly change?: InterventionChangeOutput;
  readonly deletedWorkItemIds?: readonly string[];
}
