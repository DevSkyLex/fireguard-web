import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  concatMap,
  EMPTY,
  filter,
  finalize,
  forkJoin,
  from,
  map,
  mergeMap,
  of,
  pipe,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { isApiError } from '@core/api';
import { ConnectivityService } from '@core/connectivity';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionTransitionRequest,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionWorkspaceOptimisticService } from '@features/organization/features/interventions/services/intervention-workspace-optimistic';
import { interventionWorkspaceStoreEvents } from './events';
import type {
  InterventionAttachmentUploadCommand,
  InterventionChangeRejectCommand,
  InterventionCommentAddCommand,
  InterventionDetailsUpdateCommand,
  InterventionWorkItemCreateCommand,
  InterventionWorkItemDeleteCommand,
  InterventionWorkItemStatusCommand,
  InterventionWorkspaceState,
} from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Empty starting state for the component-scoped InterventionWorkspaceStore.
 * All collections are empty and every call state starts idle.
 *
 * @since 1.0.0
 *
 * @type {InterventionWorkspaceState}
 */
const INITIAL_STATE: InterventionWorkspaceState = {
  intervention: null,
  workItems: [],
  changes: [],
  issues: [],
  loadCallState: idleCallState(),
  transitionCallState: idleCallState(),
  updateDetailsCallState: idleCallState(),
  createWorkItemCallState: idleCallState(),
  workItemWriteCallState: idleCallState(),
  pendingWorkItemIds: new Set<string>(),
  deleteWorkItemsCallState: idleCallState(),
  rejectChangeCallState: idleCallState(),
  pendingChangeIds: new Set<string>(),
  deleteCallState: idleCallState(),
  addCommentCallState: idleCallState(),
  attachments: [],
  attachmentsCallState: idleCallState(),
  attachmentWriteCallState: idleCallState(),
  pendingAttachmentIds: new Set<string>(),
  activities: [],
  activityTotal: 0,
  activityOldestPage: null,
  activityCallState: idleCallState(),
};

/**
 * Constant IDLE_WRITE_STATES
 * @const IDLE_WRITE_STATES
 *
 * @description
 * Every write concern reset to idle, with the per-row pending sets emptied.
 * Applied on workspace entry and by `clearError()`, so a stale failure from a
 * previous intervention never bleeds into the next one.
 *
 * @since 4.2.0
 *
 * @type {Partial<InterventionWorkspaceState>}
 */
const IDLE_WRITE_STATES: Partial<InterventionWorkspaceState> = {
  transitionCallState: idleCallState(),
  updateDetailsCallState: idleCallState(),
  createWorkItemCallState: idleCallState(),
  workItemWriteCallState: idleCallState(),
  pendingWorkItemIds: new Set<string>(),
  deleteWorkItemsCallState: idleCallState(),
  rejectChangeCallState: idleCallState(),
  pendingChangeIds: new Set<string>(),
  deleteCallState: idleCallState(),
  addCommentCallState: idleCallState(),
  attachmentWriteCallState: idleCallState(),
  pendingAttachmentIds: new Set<string>(),
};

/**
 * Function withId
 * @function withId
 *
 * @description
 * Returns a new set with `id` added, leaving the source untouched so signal
 * consumers see a fresh reference.
 *
 * @since 4.2.0
 *
 * @param {ReadonlySet<string>} ids - Current set.
 * @param {string} id - Id to add.
 *
 * @return {ReadonlySet<string>} New set containing `id`.
 */
function withId(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(ids);
  next.add(id);
  return next;
}

/**
 * Function withoutId
 * @function withoutId
 *
 * @description
 * Returns a new set with `id` removed, leaving the source untouched.
 *
 * @since 4.2.0
 *
 * @param {ReadonlySet<string>} ids - Current set.
 * @param {string} id - Id to remove.
 *
 * @return {ReadonlySet<string>} New set without `id`.
 */
function withoutId(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}

/**
 * Function workspaceFailure
 * @function workspaceFailure
 *
 * @description
 * Normalizes a caught error and guarantees it carries a human-readable message.
 *
 * A structured API problem (RFC 7807) is trusted for its `detail`: it is the most
 * specific explanation available, and for a 422 it travels with the `violations` a
 * form can project onto its fields. Everything else — transport failures, bare
 * 500s — falls back to `fallback`.
 *
 * @since 1.1.0
 *
 * @param {unknown} error - The caught error.
 * @param {string} fallback - Localized message to use when the API said nothing.
 *
 * @return {StoreError} Normalized error with a non-null message.
 */
function workspaceFailure(error: unknown, fallback: string): StoreError {
  const storeError: StoreError = toStoreError(error);
  // Only a structured API problem carries a message worth showing. A raw Error
  // yields things like "Http failure response for /api/...", which `toStoreError`
  // happily copies into `message` — never put that in front of a field agent.
  const detail: string | null = isApiError(storeError.error) ? storeError.message : null;

  return { ...storeError, message: detail ?? fallback };
}

/**
 * Function replaceWorkItem
 * @function replaceWorkItem
 *
 * @description
 * Returns a new array with the work item identified by `workItemId`
 * replaced by `replacement`. Returns the original array unchanged if no
 * matching item is found, preserving referential stability.
 *
 * @since 1.0.0
 *
 * @param {readonly InterventionWorkItemOutput[]} items - Current work-item list.
 * @param {string} workItemId - Id of the item to replace.
 * @param {InterventionWorkItemOutput} replacement - New item value to splice in.
 *
 * @return {readonly InterventionWorkItemOutput[]} Updated immutable list.
 */
function replaceWorkItem(
  items: readonly InterventionWorkItemOutput[],
  workItemId: string,
  replacement: InterventionWorkItemOutput,
): readonly InterventionWorkItemOutput[] {
  const index = items.findIndex((item) => item.id === workItemId);
  if (index < 0) return items;
  const updated: InterventionWorkItemOutput[] = [...items];
  updated[index] = replacement;
  return updated;
}

/**
 * Store InterventionWorkspaceStore
 * @const InterventionWorkspaceStore
 *
 * @description
 * Component-scoped NgRx SignalStore owning the full intervention workspace:
 * intervention details, work items, change log and quality issues.
 * Coordinates online/offline reads and optimistic writes for every field
 * action (transitions, detail updates, work-item creation and status changes).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionWorkspaceStore = signalStore(
  withState<InterventionWorkspaceState>(INITIAL_STATE),
  withComputed((store) => ({
    /** Whether the workspace fetch is in flight. */
    loading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /** Whether any write is in flight, across every named write concern. */
    saving: computed<boolean>(
      () =>
        isCallPending(store.transitionCallState()) ||
        isCallPending(store.updateDetailsCallState()) ||
        isCallPending(store.createWorkItemCallState()) ||
        isCallPending(store.workItemWriteCallState()) ||
        isCallPending(store.deleteWorkItemsCallState()) ||
        isCallPending(store.rejectChangeCallState()) ||
        isCallPending(store.deleteCallState()) ||
        isCallPending(store.addCommentCallState()) ||
        isCallPending(store.attachmentWriteCallState()),
    ),

    /**
     * Message of the last failure, load or write, for the page banner.
     *
     * A write failure wins over a stale load failure: it is the more recent thing
     * the user did.
     */
    error: computed<string | null>(
      () =>
        store.transitionCallState().error?.message ??
        store.updateDetailsCallState().error?.message ??
        store.createWorkItemCallState().error?.message ??
        store.workItemWriteCallState().error?.message ??
        store.deleteWorkItemsCallState().error?.message ??
        store.rejectChangeCallState().error?.message ??
        store.deleteCallState().error?.message ??
        store.addCommentCallState().error?.message ??
        store.attachmentWriteCallState().error?.message ??
        store.loadCallState().error?.message ??
        null,
    ),

    /**
     * Whether the last workspace *fetch* failed, as opposed to a write.
     *
     * A page needs the distinction to decide what to offer: re-running `load`
     * is the repair for a failed fetch and the wrong repair for a rejected
     * patch, which {@link error} alone cannot tell apart.
     */
    loadFailed: computed<boolean>(() => isCallError(store.loadCallState())),

    /**
     * Whether the timeline has entries older than the ones held, so a surface
     * can offer to walk further back instead of implying it shows everything.
     */
    hasOlderActivities: computed<boolean>(() => {
      const oldest: number | null = store.activityOldestPage();

      return oldest !== null && oldest > 1;
    }),

    /**
     * Normalized error of the last write, first non-null across the named
     * write concerns.
     *
     * Unlike {@link error}, this keeps the whole payload, so a page can hand a 422
     * to the form that caused it and land each violation on the field it names.
     */
    mutationError: computed<StoreError | null>(
      () =>
        store.transitionCallState().error ??
        store.updateDetailsCallState().error ??
        store.createWorkItemCallState().error ??
        store.workItemWriteCallState().error ??
        store.deleteWorkItemsCallState().error ??
        store.rejectChangeCallState().error ??
        store.deleteCallState().error ??
        store.addCommentCallState().error ??
        store.attachmentWriteCallState().error ??
        null,
    ),

    progress: computed<number>(() => {
      const total = store.workItems().length;
      if (total === 0) return 0;
      const done = store
        .workItems()
        .filter((item) => item.status === 'completed' || item.status === 'skipped').length;
      return Math.round((done / total) * 100);
    }),
    blockerCount: computed<number>(
      () => store.issues().filter((issue) => issue.severity === 'blocker').length,
    ),
    nextWorkItem: computed<InterventionWorkItemOutput | null>(
      () =>
        store.workItems().find((item) => item.status === 'in_progress') ??
        store.workItems().find((item) => item.status === 'planned') ??
        null,
    ),
  })),
  withMethods(
    (
      store,
      service = inject<InterventionService>(InterventionService),
      offline = inject<InterventionOfflineService>(InterventionOfflineService),
      connectivity = inject<ConnectivityService>(ConnectivityService),
      optimistic = inject<InterventionWorkspaceOptimisticService>(
        InterventionWorkspaceOptimisticService,
      ),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => {
      const fetchWorkspace = (interventionId: string) =>
        forkJoin({
          intervention: service.get(interventionId),
          workItems: service.listAllWorkItems(interventionId),
          changes: service.listAllChanges(interventionId),
          issues: service.listIssues(interventionId),
        }).pipe(
          catchError((error: unknown) =>
            connectivity.isNetworkFailure(error)
              ? from(offline.getWorkspace(interventionId)).pipe(
                  map((workspace) => {
                    if (!workspace) throw error; // Rethrow the network failure, not a generic Error: `loadFailure` branches on it.
                    return {
                      intervention: workspace.intervention,
                      workItems: workspace.workItems,
                      changes: workspace.changes,
                      issues: { member: workspace.issues },
                    };
                  }),
                )
              : throwError(() => error),
          ),
        );

      const applyWorkspace = ({
        intervention,
        workItems,
        changes,
        issues,
      }: {
        intervention: InterventionOutput;
        workItems: readonly InterventionWorkItemOutput[];
        changes: readonly InterventionChangeOutput[];
        issues: { readonly member: readonly InterventionIssueOutput[] };
      }): void => {
        patchState(store, {
          intervention,
          workItems,
          changes,
          issues: issues.member,
          loadCallState: successCallState(null),
        });
        void offline.saveWorkspace(intervention, workItems, changes, issues.member);
      };

      const loadFailure = (error: unknown) =>
        connectivity.isNetworkFailure(error)
          ? workspaceFailure(
              error,
              $localize`:@@intervention.workspace.loadOffline:This intervention has not been saved on this device, so it cannot be opened offline. Reconnect and try again.`,
            )
          : workspaceFailure(
              error,
              $localize`:@@intervention.workspace.loadFailed:The intervention workspace could not be loaded.`,
            );

      const load = rxMethod<string>(
        pipe(
          tap(() =>
            patchState(store, {
              intervention: null,
              workItems: [],
              changes: [],
              issues: [],
              attachments: [],
              attachmentsCallState: idleCallState(),
              loadCallState: pendingCallState(),
              ...IDLE_WRITE_STATES,
            }),
          ),
          switchMap((interventionId) =>
            fetchWorkspace(interventionId).pipe(
              tapResponse({
                next: applyWorkspace,
                error: (error: unknown) =>
                  patchState(store, {
                    intervention: null,
                    workItems: [],
                    changes: [],
                    issues: [],
                    loadCallState: errorCallState(loadFailure(error)),
                  }),
              }),
            ),
          ),
        ),
      );

      /**
       * Method reload
       * @method reload
       *
       * @description
       * Re-reads the workspace without blanking it first. `load` clears the
       * intervention, work items, changes and issues before fetching, which is
       * right on entry and wrong afterwards: refreshing after a publication or
       * a transition would flash the whole page to a skeleton and back. A
       * failed reload keeps what is on screen and reports through
       * `loadCallState`.
       *
       * @access public
       * @since 1.3.0
       *
       * @type {RxMethod<string>}
       */
      const reload = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap((interventionId) =>
            fetchWorkspace(interventionId).pipe(
              tapResponse({
                next: applyWorkspace,
                error: (error: unknown) =>
                  patchState(store, { loadCallState: errorCallState(loadFailure(error)) }),
              }),
            ),
          ),
        ),
      );

      /**
       * Method loadActivities
       * @method loadActivities
       *
       * @description
       * Loads the **newest** page of the intervention's activity timeline.
       *
       * The API sorts `createdAt` ascending, so page 1 holds the oldest entries.
       * Reading it and stopping there showed a months-old history as the whole
       * timeline and made the page's "last touched" line report the *first*
       * event as the latest. So page 1 is read for its shape — `totalItems` and
       * the server's page size, which the client is not told — and when it is
       * not the entire timeline the last page is fetched and page 1 discarded.
       * That is one extra request, and only for an intervention with more than
       * one page of history.
       *
       * On a network failure while an in-memory snapshot already exists (the tab
       * was opened before going offline), keeps that snapshot and reports
       * success instead of surfacing a transient offline error; otherwise the
       * error is normalized into `activityCallState`.
       *
       * ⚠️ Zoneless: this method reads and writes `activityCallState`. Never
       * call it from inside a tracked `effect()` without `untracked()`.
       *
       * @access public
       * @since 1.2.0
       *
       * @type {RxMethod<string>}
       */
      const loadActivities = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { activityCallState: pendingCallState() })),
          switchMap((interventionId) =>
            service.listActivities(interventionId).pipe(
              switchMap((first) => {
                const pageSize: number = first.member.length;
                if (pageSize === 0 || pageSize >= first.totalItems)
                  return of({ page: 1, collection: first });

                const lastPage: number = Math.ceil(first.totalItems / pageSize);

                return service
                  .listActivities(interventionId, lastPage)
                  .pipe(map((collection) => ({ page: lastPage, collection })));
              }),
              tapResponse({
                next: ({ page, collection }) =>
                  patchState(store, {
                    activities: collection.member,
                    activityTotal: collection.totalItems,
                    activityOldestPage: page,
                    activityCallState: successCallState(null),
                  }),
                error: (error: unknown) => {
                  if (connectivity.isNetworkFailure(error) && store.activities().length > 0) {
                    patchState(store, { activityCallState: successCallState(null) });
                    return;
                  }
                  patchState(store, { activityCallState: errorCallState(toStoreError(error)) });
                },
              }),
            ),
          ),
        ),
      );

      /**
       * Method loadOlderActivities
       * @method loadOlderActivities
       *
       * @description
       * Prepends the page just above the oldest one currently held, walking the
       * timeline backwards from the tail {@link loadActivities} landed on. A
       * no-op once page 1 is loaded.
       *
       * ⚠️ Zoneless: this method reads and writes `activityCallState`. Never
       * call it from inside a tracked `effect()` without `untracked()`.
       *
       * @access public
       * @since 1.4.0
       *
       * @type {RxMethod<string>}
       */
      const loadOlderActivities = rxMethod<string>(
        pipe(
          filter(() => {
            const oldest: number | null = store.activityOldestPage();

            return oldest !== null && oldest > 1 && !isCallPending(store.activityCallState());
          }),
          tap(() => patchState(store, { activityCallState: pendingCallState() })),
          switchMap((interventionId) => {
            const target: number = (store.activityOldestPage() ?? 2) - 1;

            return service.listActivities(interventionId, target).pipe(
              tapResponse({
                next: (collection) =>
                  patchState(store, {
                    activities: [...collection.member, ...store.activities()],
                    activityTotal: collection.totalItems,
                    activityOldestPage: target,
                    activityCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { activityCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      );

      /**
       * Queues a comment as an idempotent `comment.create` outbox operation and
       * appends an optimistic entry to the timeline. Reused by the offline
       * branch and by the online branch on a network failure, so a comment is
       * never lost when the connection is down or unreachable.
       */
      const queueComment = (interventionId: string, body: string) => {
        const clientId = crypto.randomUUID();
        return from(offline.queue(interventionId, 'comment.create', { clientId, body })).pipe(
          map(() => {
            patchState(store, {
              activities: [
                ...store.activities(),
                optimistic.comment(interventionId, body, clientId),
              ],
              activityTotal: store.activityTotal() + 1,
              addCommentCallState: successCallState(null),
            });
          }),
        );
      };

      /**
       * Method addComment
       * @method addComment
       *
       * @description
       * Posts a comment and appends the server-returned activity entry to the
       * local timeline on success. When offline — or when the request fails on a
       * network error (online but unreachable) — the comment is queued as an
       * idempotent `comment.create` outbox operation and appended optimistically
       * instead of being lost, mirroring the other field actions. Only a genuine
       * server rejection dispatches `commentAddFailed` for the app-wide feedback
       * listener; the timeline is then left untouched.
       *
       * @access public
       * @since 1.2.0
       *
       * @type {RxMethod<InterventionCommentAddCommand>}
       */
      const addComment = rxMethod<InterventionCommentAddCommand>(
        pipe(
          tap(() => patchState(store, { addCommentCallState: pendingCallState() })),
          // concatMap (not switchMap): comments are independent and must never
          // cancel a previous in-flight post — a dropped comment is lost work.
          concatMap(({ interventionId, body }) => {
            if (connectivity.isOffline()) {
              return queueComment(interventionId, body);
            }

            return service.addComment(interventionId, body).pipe(
              map((activity) => {
                patchState(store, {
                  activities: [...store.activities(), activity],
                  activityTotal: store.activityTotal() + 1,
                  addCommentCallState: successCallState(null),
                });
              }),
              catchError((error: unknown) => {
                if (connectivity.isNetworkFailure(error)) {
                  return queueComment(interventionId, body);
                }
                patchState(store, { addCommentCallState: successCallState(null) });
                dispatcher.dispatch(
                  interventionWorkspaceStoreEvents.commentAddFailed(
                    toStoreFailureEventPayload(
                      toStoreError(error),
                      $localize`:@@intervention.workspace.commentAddFailed:The comment could not be posted.`,
                    ),
                  ),
                );
                return EMPTY;
              }),
            );
          }),
        ),
      );

      return {
        load,
        reload,
        loadActivities,
        loadOlderActivities,
        addComment,

        transition: rxMethod<InterventionTransitionRequest>(
          pipe(
            tap(() => patchState(store, { transitionCallState: pendingCallState() })),
            switchMap(({ interventionId, status, reviewNote }) => {
              const intervention = store.intervention();

              // Queue the transition and apply it optimistically. Reused by the
              // offline branch and by the online branch when the request fails on
              // a network error (offline that slipped past navigator.onLine), so
              // a real connectivity drop never surfaces as a lost transition.
              const queueTransition = (current: InterventionOutput) =>
                from(
                  offline.queue(interventionId, 'intervention.update', {
                    status,
                    reviewNote,
                    revision: current.revision,
                  }),
                ).pipe(
                  map(() => {
                    const updatedIntervention = optimistic.transition(current, {
                      interventionId,
                      status,
                      reviewNote,
                    });
                    patchState(store, {
                      intervention: updatedIntervention,
                      transitionCallState: successCallState(null),
                    });
                    void offline
                      .saveWorkspace(
                        updatedIntervention,
                        store.workItems(),
                        store.changes(),
                        store.issues(),
                        [],
                        { replace: false },
                      )
                      .catch(() => undefined);
                    return updatedIntervention;
                  }),
                );

              if (connectivity.isOffline() && intervention) {
                return queueTransition(intervention);
              }

              return service
                .update(interventionId, { status, reviewNote }, intervention?.revision)
                .pipe(
                  tap((updatedIntervention) =>
                    patchState(store, {
                      intervention: updatedIntervention,
                      transitionCallState: successCallState(null),
                    }),
                  ),
                  catchError((error: unknown) => {
                    if (connectivity.isNetworkFailure(error) && intervention) {
                      return queueTransition(intervention);
                    }
                    // Distinguish the workflow-relevant statuses so a stale
                    // revision (412) tells the user to refresh instead of
                    // retrying in a loop, mirroring the list store's mapping.
                    const storeError = toStoreError(error);
                    patchState(store, {
                      // Spread the normalized error rather than replace it: the
                      // status-specific wording below is friendlier than the API's
                      // `detail`, but the payload underneath still carries the 422
                      // violations a form needs.
                      transitionCallState: errorCallState({
                        ...storeError,
                        message:
                          storeError.code === 412
                            ? $localize`:@@intervention.store.transitionStale:This intervention changed since it was loaded. Refresh and try again.`
                            : storeError.code === 403
                              ? $localize`:@@intervention.store.transitionForbidden:You do not have permission to change this intervention's status.`
                              : storeError.code === 422
                                ? $localize`:@@intervention.store.transitionInvalid:This status change is not allowed from the intervention's current status.`
                                : $localize`:@@intervention.workspace.transitionFailed:The intervention status could not be updated.`,
                      }),
                    });
                    return EMPTY;
                  }),
                );
            }),
          ),
        ),
        updateDetails: rxMethod<InterventionDetailsUpdateCommand>(
          pipe(
            tap(() => patchState(store, { updateDetailsCallState: pendingCallState() })),
            concatMap(({ interventionId, input }) => {
              const intervention = store.intervention();

              // Queue the details update and apply it optimistically. Reused by
              // the offline branch and by the online branch on a network failure
              // (offline that slipped past navigator.onLine), so a real
              // connectivity drop never surfaces as a lost planning edit.
              const queueDetails = (current: InterventionOutput) => {
                const { plannedStartAt, dueAt, labelIds, ...optimisticInput } = input;
                const queuedInput = {
                  ...optimisticInput,
                  ...(labelIds !== undefined ? { labelIds } : {}),
                  ...(plannedStartAt !== undefined
                    ? { plannedStartAt: plannedStartAt?.toISOString() ?? null }
                    : {}),
                  ...(dueAt !== undefined ? { dueAt: dueAt?.toISOString() ?? null } : {}),
                  revision: current.revision,
                };
                return from(offline.queue(interventionId, 'intervention.update', queuedInput)).pipe(
                  concatMap(async (): Promise<InterventionOutput> => {
                    const updatedIntervention: InterventionOutput = {
                      ...current,
                      ...optimisticInput,
                      ...(plannedStartAt !== undefined
                        ? { plannedStartAt: plannedStartAt?.toISOString() ?? null }
                        : {}),
                      ...(dueAt !== undefined ? { dueAt: dueAt?.toISOString() ?? null } : {}),
                      revision: current.revision + 1,
                      updatedAt: new Date().toISOString(),
                    };
                    patchState(store, {
                      intervention: updatedIntervention,
                      updateDetailsCallState: successCallState(null),
                    });
                    await offline.saveWorkspace(
                      updatedIntervention,
                      store.workItems(),
                      store.changes(),
                      store.issues(),
                      [],
                      { replace: false },
                    );
                    return updatedIntervention;
                  }),
                  catchError((error: unknown) => {
                    patchState(store, {
                      updateDetailsCallState: errorCallState(
                        workspaceFailure(
                          error,
                          $localize`:@@intervention.workspace.detailsFailed:Intervention planning details could not be saved.`,
                        ),
                      ),
                    });
                    return EMPTY;
                  }),
                );
              };

              if (connectivity.isOffline() && intervention) {
                return queueDetails(intervention);
              }

              return service.update(interventionId, input, intervention?.revision).pipe(
                tap((updatedIntervention) =>
                  patchState(store, {
                    intervention: updatedIntervention,
                    updateDetailsCallState: successCallState(null),
                  }),
                ),
                catchError((error: unknown) => {
                  if (connectivity.isNetworkFailure(error) && intervention) {
                    return queueDetails(intervention);
                  }
                  patchState(store, {
                    updateDetailsCallState: errorCallState(
                      workspaceFailure(
                        error,
                        $localize`:@@intervention.workspace.detailsFailed:Intervention planning details could not be saved.`,
                      ),
                    ),
                  });
                  return EMPTY;
                }),
              );
            }),
          ),
        ),

        createWorkItem: rxMethod<InterventionWorkItemCreateCommand>(
          pipe(
            tap(() => patchState(store, { createWorkItemCallState: pendingCallState() })),
            switchMap(({ interventionId, input }) => {
              if (connectivity.isOffline()) {
                const clientId = input.clientId ?? crypto.randomUUID();
                const localWorkItem = optimistic.createWorkItem(input, clientId);
                const intervention = store.intervention();
                return from(
                  offline.queue(interventionId, 'work-item.create', { ...input, clientId }),
                ).pipe(
                  tap(() => {
                    const workItems: readonly InterventionWorkItemOutput[] = [
                      ...store.workItems(),
                      localWorkItem,
                    ];
                    const updatedIntervention = optimistic.addWorkItem(intervention);
                    patchState(store, {
                      intervention: updatedIntervention,
                      workItems,
                      createWorkItemCallState: successCallState(null),
                    });
                    if (updatedIntervention) {
                      void offline
                        .saveWorkspace(
                          updatedIntervention,
                          workItems,
                          store.changes(),
                          store.issues(),
                          [],
                          {
                            replace: false,
                          },
                        )
                        .catch(() => undefined);
                    }
                  }),
                );
              }

              return service.createWorkItem(input).pipe(
                tapResponse({
                  next: (created: InterventionWorkItemOutput) => {
                    // Append the authoritative created item (its assignee/target
                    // identities are already resolved by the API) and bump the
                    // intervention counters the same way the server does on a
                    // work item create. This avoids a full workspace reload and
                    // its loading flash.
                    const workItems: readonly InterventionWorkItemOutput[] = [
                      ...store.workItems(),
                      created,
                    ];
                    const updatedIntervention = optimistic.addWorkItem(store.intervention());
                    patchState(store, {
                      workItems,
                      intervention: updatedIntervention,
                      createWorkItemCallState: successCallState(null),
                    });
                    if (updatedIntervention) {
                      void offline
                        .saveWorkspace(
                          updatedIntervention,
                          workItems,
                          store.changes(),
                          store.issues(),
                          [],
                          { replace: false },
                        )
                        .catch(() => undefined);
                    }
                  },
                  error: (error: unknown) =>
                    patchState(store, {
                      createWorkItemCallState: errorCallState(
                        workspaceFailure(
                          error,
                          $localize`:@@intervention.workspace.workItemCreateFailed:The work item could not be created.`,
                        ),
                      ),
                    }),
                }),
              );
            }),
          ),
        ),
        setWorkItemStatus: rxMethod<InterventionWorkItemStatusCommand>(
          pipe(
            // mergeMap (not switchMap): a field agent ticks several checklist
            // items quickly; each toggle is independent and must not cancel the
            // previous in-flight PATCH. Each write marks its own row in
            // `pendingWorkItemIds` on entry and unmarks it on settle, so
            // concurrent toggles each lock the right row.
            mergeMap(({ interventionId, workItemId, status, skipReason }) => {
              patchState(store, {
                workItemWriteCallState: pendingCallState(),
                pendingWorkItemIds: withId(store.pendingWorkItemIds(), workItemId),
              });
              const settle = finalize(() =>
                patchState(store, {
                  pendingWorkItemIds: withoutId(store.pendingWorkItemIds(), workItemId),
                }),
              );
              const item = store.workItems().find((current) => current.id === workItemId);
              const normalizedSkipReason: string | null =
                status === 'skipped' ? (skipReason ?? item?.skipReason ?? null) : null;
              if (connectivity.isOffline() && item) {
                return from(
                  offline.queue(interventionId, 'work-item.update', {
                    workItemId,
                    status,
                    skipReason: normalizedSkipReason,
                    revision: item.revision,
                  }),
                ).pipe(
                  tap(() => {
                    const result = optimistic.updateWorkItem(store.intervention(), item, {
                      workItemId,
                      status,
                      skipReason: normalizedSkipReason ?? undefined,
                    });
                    const updatedItem = result.workItem;
                    const workItems = replaceWorkItem(store.workItems(), workItemId, updatedItem);
                    const updatedIntervention = result.intervention;
                    patchState(store, {
                      intervention: updatedIntervention,
                      workItems,
                      workItemWriteCallState: successCallState(null),
                    });
                    if (updatedIntervention) {
                      void offline
                        .saveWorkspace(
                          updatedIntervention,
                          workItems,
                          store.changes(),
                          store.issues(),
                          [],
                          {
                            replace: false,
                          },
                        )
                        .catch(() => undefined);
                    }
                  }),
                  settle,
                );
              }

              return service
                .updateWorkItem(
                  workItemId,
                  { status, skipReason: normalizedSkipReason },
                  item?.revision,
                )
                .pipe(
                  tapResponse({
                    // Patch the toggled item (and the intervention's recomputed
                    // progress) in place instead of a full `load()`, so ticking an
                    // item never flashes the full-screen skeleton and concurrent
                    // ticks don't each trigger a competing reload.
                    next: () => {
                      if (!item) {
                        patchState(store, { workItemWriteCallState: successCallState(null) });

                        return;
                      }
                      const result = optimistic.updateWorkItem(store.intervention(), item, {
                        workItemId,
                        status,
                        skipReason: normalizedSkipReason ?? undefined,
                      });
                      const workItems = replaceWorkItem(
                        store.workItems(),
                        workItemId,
                        result.workItem,
                      );
                      patchState(store, {
                        intervention: result.intervention,
                        workItems,
                        workItemWriteCallState: successCallState(null),
                      });
                      if (result.intervention) {
                        void offline
                          .saveWorkspace(
                            result.intervention,
                            workItems,
                            store.changes(),
                            store.issues(),
                            [],
                            { replace: false },
                          )
                          .catch(() => undefined);
                      }
                    },
                    error: (error: unknown) =>
                      patchState(store, {
                        workItemWriteCallState: errorCallState(
                          workspaceFailure(
                            error,
                            $localize`:@@intervention.workspace.workItemUpdateFailed:The work item could not be updated.`,
                          ),
                        ),
                      }),
                  }),
                  settle,
                );
            }),
          ),
        ),

        /**
         * Method rejectChange
         * @method rejectChange
         *
         * @description
         * Rejects one proposed change (`PATCH` to `rejected`), the only status
         * a client may set — acceptance happens automatically at publication.
         * The change's row locks through {@link pendingChangeIds} while the
         * write is in flight. Offline — or on a network failure — the write is
         * queued as an idempotent `change.update` outbox operation (the replay
         * path already exists in the sync service) and applied optimistically.
         * A genuine server rejection dispatches `rejectChangeFailed` for the
         * app-wide feedback listener and leaves the change untouched.
         *
         * ⚠️ Zoneless: reads and writes its own call state — never call it from
         * a tracked `effect()` without `untracked()`.
         *
         * @access public
         * @since 4.2.0
         *
         * @type {RxMethod<InterventionChangeRejectCommand>}
         */
        rejectChange: rxMethod<InterventionChangeRejectCommand>(
          pipe(
            // mergeMap: rejections of distinct changes are independent writes.
            mergeMap(({ interventionId, changeId }) => {
              const change = store.changes().find((current) => current.id === changeId);
              if (!change || change.status !== 'proposed') return EMPTY;

              patchState(store, {
                rejectChangeCallState: pendingCallState(),
                pendingChangeIds: withId(store.pendingChangeIds(), changeId),
              });
              const settle = finalize(() =>
                patchState(store, {
                  pendingChangeIds: withoutId(store.pendingChangeIds(), changeId),
                }),
              );

              const applyRejection = (rejected: InterventionChangeOutput): void => {
                const changes: readonly InterventionChangeOutput[] = store
                  .changes()
                  .map((current) => (current.id === changeId ? rejected : current));
                patchState(store, {
                  changes,
                  rejectChangeCallState: successCallState(null),
                });
                const intervention = store.intervention();
                if (intervention) {
                  void offline
                    .saveWorkspace(intervention, store.workItems(), changes, store.issues(), [], {
                      replace: false,
                    })
                    .catch(() => undefined);
                }
              };

              const queueRejection = () =>
                from(
                  offline.queue(interventionId, 'change.update', {
                    changeId,
                    status: 'rejected',
                    revision: change.revision,
                  }),
                ).pipe(
                  tap(() =>
                    applyRejection({
                      ...change,
                      status: 'rejected',
                      revision: change.revision + 1,
                      updatedAt: new Date().toISOString(),
                    }),
                  ),
                  settle,
                );

              if (connectivity.isOffline()) {
                return queueRejection();
              }

              return service.updateChange(changeId, { status: 'rejected' }, change.revision).pipe(
                tap((rejected) => applyRejection(rejected)),
                catchError((error: unknown) => {
                  if (connectivity.isNetworkFailure(error)) {
                    return queueRejection();
                  }
                  patchState(store, { rejectChangeCallState: successCallState(null) });
                  dispatcher.dispatch(
                    interventionWorkspaceStoreEvents.rejectChangeFailed(
                      toStoreFailureEventPayload(
                        toStoreError(error),
                        $localize`:@@intervention.workspace.rejectChangeFailed:The proposed change could not be rejected.`,
                      ),
                    ),
                  );
                  return EMPTY;
                }),
                settle,
              );
            }),
          ),
        ),

        deleteWorkItems: rxMethod<InterventionWorkItemDeleteCommand>(
          pipe(
            tap(() => patchState(store, { deleteWorkItemsCallState: pendingCallState() })),
            switchMap(({ workItems }) => {
              if (workItems.length === 0) {
                patchState(store, { deleteWorkItemsCallState: successCallState(null) });
                return EMPTY;
              }

              // Deleting a planned work item is a connected, desk-time planning
              // action; the offline outbox only replays creates and status
              // changes, so surface a clear message instead of silently failing.
              if (connectivity.isOffline()) {
                patchState(store, {
                  deleteWorkItemsCallState: errorCallState({
                    error: null,
                    message: $localize`:@@intervention.workspace.workItemDeleteOffline:Connect to the network to delete planned work items.`,
                    code: null,
                    retryable: true,
                    timestamp: 0,
                  }),
                });
                return EMPTY;
              }

              return forkJoin(
                workItems.map((item) => service.removeWorkItem(item.id, item.revision)),
              ).pipe(
                tapResponse({
                  next: () => {
                    // Drop the deleted items and mirror the server's counter
                    // recompute locally so the rail and table stay in sync
                    // without a full workspace reload and its loading flash.
                    const removedIds = new Set(workItems.map((item) => item.id));
                    const remaining: readonly InterventionWorkItemOutput[] = store
                      .workItems()
                      .filter((item) => !removedIds.has(item.id));
                    const updatedIntervention = optimistic.removeWorkItem(
                      store.intervention(),
                      workItems,
                    );
                    patchState(store, {
                      workItems: remaining,
                      intervention: updatedIntervention,
                      deleteWorkItemsCallState: successCallState(null),
                    });
                    if (updatedIntervention) {
                      void offline
                        .saveWorkspace(
                          updatedIntervention,
                          remaining,
                          store.changes(),
                          store.issues(),
                          [],
                          { replace: false },
                        )
                        .catch(() => undefined);
                    }
                  },
                  error: (error: unknown) =>
                    patchState(store, {
                      deleteWorkItemsCallState: errorCallState(
                        workspaceFailure(
                          error,
                          $localize`:@@intervention.workspace.workItemDeleteFailed:The work item could not be deleted.`,
                        ),
                      ),
                    }),
                }),
              );
            }),
          ),
        ),

        /**
         * Method delete
         * @method delete
         *
         * @description
         * Deletes the loaded intervention (`InterventionService.remove`). Only
         * draft or abandoned interventions may be deleted; the API refuses
         * any other status with a 409, whose RFC 7807 `detail` is surfaced
         * verbatim. On success dispatches `deleteSucceeded` (toast) — the
         * page listens and navigates away, since there is nothing left here
         * to render once the component-scoped store is torn down.
         *
         * @access public
         * @since 1.0.0
         *
         * @type {RxMethod<{ interventionId: string }>}
         */
        delete: rxMethod<{ interventionId: string }>(
          pipe(
            tap(() => patchState(store, { deleteCallState: pendingCallState() })),
            switchMap(({ interventionId }) => {
              const intervention = store.intervention();
              if (!intervention) {
                patchState(store, { deleteCallState: successCallState(null) });
                return EMPTY;
              }

              return service.remove(interventionId, intervention.revision).pipe(
                tap(() => {
                  patchState(store, { deleteCallState: successCallState(null) });
                  dispatcher.dispatch(
                    interventionWorkspaceStoreEvents.deleteSucceeded(
                      successFeedback($localize`:@@intervention.delete.toast:Intervention deleted`),
                    ),
                  );
                }),
                catchError((error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, {
                    deleteCallState: errorCallState({
                      ...storeError,
                      message:
                        storeError.code === 409
                          ? (storeError.message ??
                            $localize`:@@intervention.store.deleteConflict:Only draft or abandoned interventions can be deleted.`)
                          : storeError.code === 403
                            ? $localize`:@@intervention.store.deleteForbidden:You do not have permission to delete this intervention.`
                            : $localize`:@@intervention.workspace.deleteFailed:The intervention could not be deleted.`,
                    }),
                  });
                  return EMPTY;
                }),
              );
            }),
          ),
        ),

        /**
         * Method loadAttachments
         * @method loadAttachments
         *
         * @description
         * Lazily reads the intervention's attachments — called by the
         * attachments section on the browser, never by the SSR-critical
         * workspace fetch.
         *
         * ⚠️ Zoneless: reads and writes its own call state — never call it
         * from a tracked `effect()` without `untracked()`.
         *
         * @access public
         * @since 4.4.0
         *
         * @type {RxMethod<string>}
         */
        loadAttachments: rxMethod<string>(
          pipe(
            tap(() => patchState(store, { attachmentsCallState: pendingCallState() })),
            switchMap((interventionId) =>
              service.listAttachments(interventionId).pipe(
                tapResponse({
                  next: (collection) =>
                    patchState(store, {
                      attachments: collection.member,
                      attachmentsCallState: successCallState(null),
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      attachmentsCallState: errorCallState(toStoreError(error)),
                    }),
                }),
              ),
            ),
          ),
        ),

        /**
         * Method uploadAttachment
         * @method uploadAttachment
         *
         * @description
         * Uploads one file (online-only in this pass — the outbox has no
         * attachment operation) and appends the created attachment. Uses
         * `concatMap`: two picked files upload in order, neither cancelled.
         *
         * @access public
         * @since 4.4.0
         *
         * @type {RxMethod<InterventionAttachmentUploadCommand>}
         */
        uploadAttachment: rxMethod<InterventionAttachmentUploadCommand>(
          pipe(
            tap(() => patchState(store, { attachmentWriteCallState: pendingCallState() })),
            concatMap(({ interventionId, file, fileName, label }) =>
              service.uploadAttachment(interventionId, file, fileName, label).pipe(
                tapResponse({
                  next: (created) =>
                    patchState(store, {
                      attachments: [...store.attachments(), created],
                      attachmentWriteCallState: successCallState(null),
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      attachmentWriteCallState: errorCallState(
                        workspaceFailure(
                          error,
                          $localize`:@@intervention.workspace.attachmentUploadFailed:The file could not be uploaded.`,
                        ),
                      ),
                    }),
                }),
              ),
            ),
          ),
        ),

        /**
         * Method removeAttachment
         * @method removeAttachment
         *
         * @description
         * Deletes one attachment; the row locks itself through
         * {@link pendingAttachmentIds}.
         *
         * @access public
         * @since 4.4.0
         *
         * @type {RxMethod<{ attachmentId: string; revision: number }>}
         */
        removeAttachment: rxMethod<{ attachmentId: string; revision: number }>(
          pipe(
            mergeMap(({ attachmentId, revision }) => {
              patchState(store, {
                attachmentWriteCallState: pendingCallState(),
                pendingAttachmentIds: withId(store.pendingAttachmentIds(), attachmentId),
              });

              return service.removeAttachment(attachmentId, revision).pipe(
                tapResponse({
                  next: () =>
                    patchState(store, {
                      attachments: store
                        .attachments()
                        .filter((attachment) => attachment.id !== attachmentId),
                      attachmentWriteCallState: successCallState(null),
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      attachmentWriteCallState: errorCallState(
                        workspaceFailure(
                          error,
                          $localize`:@@intervention.workspace.attachmentDeleteFailed:The file could not be deleted.`,
                        ),
                      ),
                    }),
                }),
                finalize(() =>
                  patchState(store, {
                    pendingAttachmentIds: withoutId(store.pendingAttachmentIds(), attachmentId),
                  }),
                ),
              );
            }),
          ),
        ),

        /**
         * Method touchOfflineIntervention
         * @method touchOfflineIntervention
         *
         * @description
         * Mirrors the server-side intervention revision increment caused by a
         * queued resource or media mutation.
         *
         * @access public
         * @since 1.0.0
         *
         * @return {Promise<void>} Resolves after the local workspace is persisted.
         */
        async touchOfflineIntervention(): Promise<void> {
          const intervention = store.intervention();
          if (!intervention) return;
          const updatedIntervention = optimistic.touch(intervention);
          patchState(store, { intervention: updatedIntervention });
          await offline.saveWorkspace(
            updatedIntervention,
            store.workItems(),
            store.changes(),
            store.issues(),
            [],
            { replace: false },
          );
        },

        /**
         * Method recordQueuedDiscovery
         * @method recordQueuedDiscovery
         *
         * @description
         * Appends a discovered work item that has already been persisted as an
         * atomic outbox intention. Updates the store optimistically and
         * persists the updated workspace to the offline cache without
         * overwriting existing operations.
         *
         * @access public
         * @since 1.0.0
         *
         * @param {CreateInterventionWorkItemInput} input - Work-item input carrying the client-generated id.
         *
         * @return {Promise<void>} Resolves after the local workspace is persisted.
         */
        async recordQueuedDiscovery(input: CreateInterventionWorkItemInput): Promise<void> {
          const intervention = store.intervention();
          const clientId = input.clientId;
          if (!intervention || !clientId) return;

          const workItem = optimistic.createWorkItem(input, clientId);
          const workItems: readonly InterventionWorkItemOutput[] = [...store.workItems(), workItem];
          const updatedIntervention = optimistic.addWorkItem(optimistic.touch(intervention));
          patchState(store, { intervention: updatedIntervention, workItems });
          await offline.saveWorkspace(
            updatedIntervention,
            workItems,
            store.changes(),
            store.issues(),
            [],
            { replace: false },
          );
        },

        /**
         * Method clearError
         * @method clearError
         *
         * @description
         * Resets the store error to null. Typically called when the user
         * dismisses an error banner or retries a failed operation.
         *
         * @access public
         * @since 1.0.0
         *
         * @return {void}
         */
        clearError(): void {
          patchState(store, {
            loadCallState: idleCallState(),
            ...IDLE_WRITE_STATES,
          });
        },
      };
    },
  ),
);

/**
 * Type InterventionWorkspaceStoreType
 *
 * @description
 * Defines the supported intervention workspace store type values.
 */
export type InterventionWorkspaceStoreType = InstanceType<typeof InterventionWorkspaceStore>;
