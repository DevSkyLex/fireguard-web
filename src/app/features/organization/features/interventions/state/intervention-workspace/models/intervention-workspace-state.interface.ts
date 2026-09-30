import type { CallState } from '@core/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type {
  InterventionActivityOutput,
  InterventionAttachmentOutput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionQueuedAttachment,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import type { InterventionPlanningConfirmation } from './intervention-planning-confirmation.type';

/**
 * Interface InterventionWorkspaceState
 * @interface InterventionWorkspaceState
 *
 * @description
 * State of one intervention workspace and its independent mutation lifecycles.
 *
 * @since 1.0.0
 */
export interface InterventionWorkspaceState {
  /**
   * Property planningConfirmation
   * @readonly
   *
   * @description
   * Overload requiring an explicit human decision.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InterventionPlanningConfirmation | null}
   */
  readonly planningConfirmation: InterventionPlanningConfirmation | null;

  /**
   * Property contextId
   * @readonly
   *
   * @description
   * Identifies the context associated with this intervention workspace.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly contextId: string | null;

  /**
   * Property loadGeneration
   * @readonly
   *
   * @description
   * Fences stale workspace loads from replacing the current intervention.
   *
   * @access public
   *
   * @type {number}
   */
  readonly loadGeneration: number;

  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Contains the intervention currently loaded into the workspace.
   *
   * @access public
   *
   * @type {InterventionOutput | null}
   */
  readonly intervention: InterventionOutput | null;

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Contains the work items currently loaded for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionWorkItemOutput[]}
   */
  readonly workItems: readonly InterventionWorkItemOutput[];

  /**
   * Property changes
   * @readonly
   *
   * @description
   * Contains the proposed changes currently loaded for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionChangeOutput[]}
   */
  readonly changes: readonly InterventionChangeOutput[];

  /**
   * Property issues
   * @readonly
   *
   * @description
   * Contains readiness issues currently reported for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionIssueOutput[]}
   */
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
   * Property loadCallState
   * @readonly
   *
   * @description
   * Lifecycle of the workspace fetch that seeds this state.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property transitionCallState
   * @readonly
   *
   * @description
   * One named field per write concern rather than one shared `mutationCallState`:
   * the workspace's writes are concurrent (`mergeMap` on work items, `concatMap`
   * on comments), and a shared field attributed the spinner and the error to
   * whichever write finished last — the wrong row, half the time. Each field
   * still keeps the normalized `StoreError`, so an HTTP 422 reaches the form
   * that caused it.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly transitionCallState: CallState;

  /**
   * Property updateDetailsCallState
   * @readonly
   *
   * @description
   * Lifecycle of a planning-details update (`updateDetails`).
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly updateDetailsCallState: CallState;

  /**
   * Property createWorkItemCallState
   * @readonly
   *
   * @description
   * Lifecycle of a work-item creation (`createWorkItem`).
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly createWorkItemCallState: CallState;

  /**
   * Property createFacilityCallState
   * @readonly
   *
   * @description
   * intervention has left the mutable window
   * (draft/planned/in_progress/changes_requested); both it and any `422`
   * violation are rendered inline by the facility sheet through this field's
   * `error`, mirroring {@link assignTeamCallState}.
   *
   * @access public
   *
   * @type {CallState<FacilityOutput>}
   */
  readonly createFacilityCallState: CallState<FacilityOutput>;

  /**
   * Property workItemWriteCallState
   * @readonly
   *
   * @description
   * With concurrent writes the per-row attribution lives in
   * {@link pendingWorkItemIds}; this field carries the latest error.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly workItemWriteCallState: CallState;

  /**
   * Property pendingWorkItemIds
   * @readonly
   *
   * @description
   * call state — is what locks and spins a row, so two concurrent writes each
   * mark their own row.
   *
   * @access public
   *
   * @type {ReadonlySet<string>}
   */
  readonly pendingWorkItemIds: ReadonlySet<string>;

  /**
   * Property deleteWorkItemsCallState
   * @readonly
   *
   * @description
   * Lifecycle of a batch work-item deletion (`deleteWorkItems`).
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly deleteWorkItemsCallState: CallState;

  /**
   * Property rejectChangeCallState
   * @readonly
   *
   * @description
   * per-row attribution lives in {@link pendingChangeIds}.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly rejectChangeCallState: CallState;

  /**
   * Property pendingChangeIds
   * @readonly
   *
   * @description
   * Ids of the proposed changes with a rejection in flight.
   *
   * @access public
   *
   * @type {ReadonlySet<string>}
   */
  readonly pendingChangeIds: ReadonlySet<string>;

  /**
   * Property deleteCallState
   * @readonly
   *
   * @description
   * Lifecycle of the intervention deletion (`delete`).
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly deleteCallState: CallState;

  /**
   * Property assignTeamCallState
   * @readonly
   *
   * @description
   * has no active members; a `409` means the intervention has left the
   * mutable window (draft/planned/in_progress/changes_requested) — both are
   * rendered inline by the dialog through this field's `error`.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly assignTeamCallState: CallState;

  /**
   * Property attachments
   * @readonly
   *
   * @description
   * attachments section, never by the SSR-critical workspace fetch.
   *
   * @access public
   *
   * @type {readonly InterventionAttachmentOutput[]}
   */
  readonly attachments: readonly InterventionAttachmentOutput[];

  /**
   * Property attachmentsCallState
   * @readonly
   *
   * @description
   * Lifecycle of the lazy attachments fetch (`loadAttachments`).
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly attachmentsCallState: CallState;

  /**
   * Property queuedAttachments
   * @readonly
   *
   * @description
   * queue order. Loaded with the attachments and updated on queue/discard, so
   * the list can show each one with its pending-sync badge.
   *
   * @access public
   *
   * @type {readonly InterventionQueuedAttachment[]}
   */
  readonly queuedAttachments: readonly InterventionQueuedAttachment[];

  /**
   * Property attachmentWriteCallState
   * @readonly
   *
   * @description
   * have their own {@link attachmentDeleteCallState} — the two run
   * concurrently, and one settling must not clear the other's pending state.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly attachmentWriteCallState: CallState;

  /**
   * Property attachmentDeleteCallState
   * @readonly
   *
   * @description
   * attribution lives in {@link pendingAttachmentIds}.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly attachmentDeleteCallState: CallState;

  /**
   * Property pendingAttachmentIds
   * @readonly
   *
   * @description
   * Ids of the attachments with a delete in flight.
   *
   * @access public
   *
   * @type {ReadonlySet<string>}
   */
  readonly pendingAttachmentIds: ReadonlySet<string>;

  /**
   * Property addCommentCallState
   * @readonly
   *
   * @description
   * Lifecycle of a comment post (`addComment`).
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly addCommentCallState: CallState;

  /**
   * Property activities
   * @readonly
   *
   * @description
   * intervention, ordered `createdAt` ascending.
   * This holds the **tail** of the timeline, not its head: the API sorts
   * ascending, so the newest entries are on the last page, and that is the page
   * loaded first. Older pages are prepended on demand.
   *
   * @access public
   *
   * @type {readonly InterventionActivityOutput[]}
   */
  readonly activities: readonly InterventionActivityOutput[];

  /**
   * Property activityOldestPage
   * @readonly
   *
   * @description
   * fetch. Anything above 1 means older entries exist.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly activityOldestPage: number | null;

  /**
   * Property activityCallState
   * @readonly
   *
   * @description
   * {@link loading} so the activity tab can show its own skeleton without
   * being tied to the main workspace fetch.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly activityCallState: CallState;

  /**
   * Property workItemErrors
   * @readonly
   *
   * @description
   * Failure attributed to the affected work item.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, string | null>>}
   */
  readonly workItemErrors: Readonly<Record<string, string | null>>;

  /**
   * Property changeErrors
   * @readonly
   *
   * @description
   * Failure attributed to the affected proposed change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, string | null>>}
   */
  readonly changeErrors: Readonly<Record<string, string | null>>;

  /**
   * Property issuesCallState
   * @readonly
   *
   * @description
   * Freshness of publication issue verification.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly issuesCallState: CallState;
}
