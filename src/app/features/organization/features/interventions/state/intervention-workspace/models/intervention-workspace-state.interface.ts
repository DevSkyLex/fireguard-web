import type { CallState } from '@core/request-state';
import type {
  InterventionActivityOutput,
  InterventionAttachmentOutput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionQueuedAttachment,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';

/**
 * State of one intervention workspace.
 */
export interface InterventionWorkspaceState {
  readonly intervention: InterventionOutput | null;
  readonly workItems: readonly InterventionWorkItemOutput[];
  readonly changes: readonly InterventionChangeOutput[];
  readonly issues: readonly InterventionIssueOutput[];

  /**
   * Property servedFromLocalCache
   * @readonly
   *
   * @description
   * Whether the workspace on screen came from the device's IndexedDB snapshot
   * because the network was unreachable, rather than from the API. The fallback
   * has always existed; nothing said so, and a snapshot taken before a
   * permission change renders every gate as refused with no explanation.
   *
   * @access public
   * @since 7.0.0
   *
   * @type {boolean}
   */
  readonly servedFromLocalCache: boolean;
  /**
   * Lifecycle of the workspace fetch that seeds this state.
   */
  readonly loadCallState: CallState;

  /**
   * Lifecycle of a status transition (`transition`).
   *
   * One named field per write concern rather than one shared `mutationCallState`:
   * the workspace's writes are concurrent (`mergeMap` on work items, `concatMap`
   * on comments), and a shared field attributed the spinner and the error to
   * whichever write finished last — the wrong row, half the time. Each field
   * still keeps the normalized `StoreError`, so an HTTP 422 reaches the form
   * that caused it.
   */
  readonly transitionCallState: CallState;

  /** Lifecycle of a planning-details update (`updateDetails`). */
  readonly updateDetailsCallState: CallState;

  /** Lifecycle of a work-item creation (`createWorkItem`). */
  readonly createWorkItemCallState: CallState;

  /**
   * Lifecycle of the **last** work-item status write (`setWorkItemStatus`).
   * With concurrent writes the per-row attribution lives in
   * {@link pendingWorkItemIds}; this field carries the latest error.
   */
  readonly workItemWriteCallState: CallState;

  /**
   * Ids of the work items with a status write in flight. The set — not the
   * call state — is what locks and spins a row, so two concurrent writes each
   * mark their own row.
   */
  readonly pendingWorkItemIds: ReadonlySet<string>;

  /** Lifecycle of a batch work-item deletion (`deleteWorkItems`). */
  readonly deleteWorkItemsCallState: CallState;

  /**
   * Lifecycle of the **last** proposed-change rejection (`rejectChange`);
   * per-row attribution lives in {@link pendingChangeIds}.
   */
  readonly rejectChangeCallState: CallState;

  /** Ids of the proposed changes with a rejection in flight. */
  readonly pendingChangeIds: ReadonlySet<string>;

  /** Lifecycle of the intervention deletion (`delete`). */
  readonly deleteCallState: CallState;

  /**
   * Lifecycle of a team assignment (`assignTeam`). A `422` means the team
   * has no active members; a `409` means the intervention has left the
   * mutable window (draft/planned/in_progress/changes_requested) — both are
   * rendered inline by the dialog through this field's `error`.
   */
  readonly assignTeamCallState: CallState;

  /**
   * The intervention's attachments — loaded lazily by the detail page's
   * attachments section, never by the SSR-critical workspace fetch.
   */
  readonly attachments: readonly InterventionAttachmentOutput[];

  /** Lifecycle of the lazy attachments fetch (`loadAttachments`). */
  readonly attachmentsCallState: CallState;

  /**
   * Attachment uploads waiting in the offline outbox for this intervention,
   * queue order. Loaded with the attachments and updated on queue/discard, so
   * the list can show each one with its pending-sync badge.
   */
  readonly queuedAttachments: readonly InterventionQueuedAttachment[];

  /**
   * Lifecycle of the **last** attachment upload (`uploadAttachment`). Deletes
   * have their own {@link attachmentDeleteCallState} — the two run
   * concurrently, and one settling must not clear the other's pending state.
   */
  readonly attachmentWriteCallState: CallState;

  /**
   * Lifecycle of the **last** attachment delete (`removeAttachment`); per-row
   * attribution lives in {@link pendingAttachmentIds}.
   */
  readonly attachmentDeleteCallState: CallState;

  /** Ids of the attachments with a delete in flight. */
  readonly pendingAttachmentIds: ReadonlySet<string>;

  /** Lifecycle of a comment post (`addComment`). */
  readonly addCommentCallState: CallState;

  /**
   * Activity timeline (comments and system entries) of the active
   * intervention, ordered `createdAt` ascending.
   *
   * This holds the **tail** of the timeline, not its head: the API sorts
   * ascending, so the newest entries are on the last page, and that is the page
   * loaded first. Older pages are prepended on demand.
   */
  readonly activities: readonly InterventionActivityOutput[];

  /**
   * The lowest timeline page currently loaded, or `null` before the first
   * fetch. Anything above 1 means older entries exist.
   */
  readonly activityOldestPage: number | null;

  /**
   * Loading / success / error state for `loadActivities`, kept separate from
   * {@link loading} so the activity tab can show its own skeleton without
   * being tied to the main workspace fetch.
   */
  readonly activityCallState: CallState;
  /**
   * Property workItemErrors
   * @readonly
   * @description Failure attributed to the affected work item.
   * @since 1.0.0
   * @type {Readonly<Record<string, string | null>>}
   */
  readonly workItemErrors: Readonly<Record<string, string | null>>;
  /**
   * Property changeErrors
   * @readonly
   * @description Failure attributed to the affected proposed change.
   * @since 1.0.0
   * @type {Readonly<Record<string, string | null>>}
   */
  readonly changeErrors: Readonly<Record<string, string | null>>;
  /**
   * Property issuesCallState
   * @readonly
   * @description Freshness of publication issue verification.
   * @since 1.0.0
   * @type {CallState}
   */
  readonly issuesCallState: CallState;
}
