import type { InterventionWorkItemStatus } from '@features/organization/features/interventions/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Interface WorkItemStatusOption
 * @interface WorkItemStatusOption
 *
 * @description
 * Work item status filter option used by {@link InterventionWorkItemTable}: the
 * shared {@link TagDescriptor} (`label`, `severity`, `icon`) extended with the
 * raw status value so the same descriptor drives both the `<app-tag>` rendering
 * and the table's status filter.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface WorkItemStatusOption extends TagDescriptor {
  //#region Properties
  /** Raw work item status value sent to the table filter. */
  readonly value: InterventionWorkItemStatus;
  //#endregion
}
