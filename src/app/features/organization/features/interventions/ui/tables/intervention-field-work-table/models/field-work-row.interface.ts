import type {
  InterventionWorkItemOutput,
  InterventionWorkItemSource,
  InterventionWorkItemStatus,
} from '@features/organization/features/interventions/models';

/**
 * Interface FieldWorkRow
 * @interface FieldWorkRow
 *
 * @description
 * Flattened view model for one row of {@link InterventionFieldWorkTable},
 * exposing the resolved labels the agent actually sees (action, target) plus the
 * flags driving the row actions, as plain fields so PrimeNG's client-side
 * sorting and global search operate on them.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FieldWorkRow {
  //#region Properties
  /** Stable identity used as the table `dataKey`. */
  readonly id: string;
  /** Underlying work item, forwarded to the parent on a row action. */
  readonly workItem: InterventionWorkItemOutput;
  /** Humanised action label (e.g. "Inventory"), used for display and sorting. */
  readonly actionLabel: string;
  /** Resolved target label, or null when nothing useful to show. */
  readonly targetLabel: string | null;
  /** Whether the work item was planned or discovered on site. */
  readonly source: InterventionWorkItemSource;
  /** Raw work item status, used for the badge and sorting. */
  readonly status: InterventionWorkItemStatus;
  /** Whether the target is an equipment resource (enables the photo action). */
  readonly isEquipment: boolean;
  /** Whether the item can still be skipped (not yet resolved). */
  readonly canSkip: boolean;
  //#endregion
}
