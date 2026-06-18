import type {
  InterventionWorkItemOutput,
  InterventionWorkItemStatus,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';

/**
 * Interface WorkItemRow
 * @interface WorkItemRow
 *
 * @description
 * Flattened view model for one work item row in {@link InterventionWorkItemTable},
 * exposing the resolved labels the user actually sees (action, target, assignee)
 * as plain fields so PrimeNG's client-side sorting, global search and status
 * filtering operate on them.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface WorkItemRow {
  //#region Properties
  /** Stable identity used as the table `dataKey` and selection key. */
  readonly id: string;
  /** Underlying work item, forwarded to the parent on delete. */
  readonly workItem: InterventionWorkItemOutput;
  /** Humanised action label (e.g. "Inventory"). */
  readonly actionLabel: string;
  /** Resolved target label, or null when nothing useful to show. */
  readonly targetLabel: string | null;
  /** Resolved assignee option, or null when unassigned. */
  readonly assignee: MemberSelectOption | null;
  /** Assignee display name, used for sorting and global search. */
  readonly assigneeName: string;
  /** Raw work item status, used for the badge, sort and status filter. */
  readonly status: InterventionWorkItemStatus;
  //#endregion
}
