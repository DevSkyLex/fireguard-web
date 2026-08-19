import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  InspectionOutput,
  CreateInspectionInput,
  UpdateInspectionInput,
  NonConformityOutput,
  NonConformityWaivePendingOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
  UpdateNonConformityStatusResult,
  InspectionListOptions,
  NonConformityListOptions,
} from '@features/organization/features/inspections/models';
import { isQuotaExceededError } from '@features/organization/utils';
import { ActiveInspectionStore } from '../active-inspection/active-inspection.store';
import { inspectionStoreEvents } from './events';
import type { InspectionState } from './models';
import { nonConformityStatusErrorMessage } from './utils/non-conformity-status-error-message/non-conformity-status-error-message.utils';

//#region Initial State
/**
 * Constant INITIAL_INSPECTION_STATE
 * @const INITIAL_INSPECTION_STATE
 *
 * @description
 * Initial state for the InspectionStore. Entity state is initialised by
 * `withEntities`. This constant only seeds the auxiliary state.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_INSPECTION_STATE: InspectionState = {
  totalInspections: 0,
  listCallState: idleCallState(),
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  cancelCallState: idleCallState(),
  submitCallState: idleCallState(),
  closeCallState: idleCallState(),
  totalNonConformities: 0,
  nonConformitiesListCallState: idleCallState(),
  nonConformityGetCallState: idleCallState(),
  addNonConformityCallState: idleCallState(),
  updateNonConformityStatusCallState: idleCallState(),
  nonConformityStatusErrorId: null,
  nonConformityWaivePending: {},
} as const;
//#endregion

/**
 * Store InspectionStore
 * @const InspectionStore
 *
 * @description
 * Component-scoped NgRx SignalStore for inspection list management, CRUD,
 * lifecycle transitions, and non-conformity tracking.
 * Designed to be provided at **component level** (no `providedIn: 'root'`), so
 * each consumer gets an independent instance tied to its own lifecycle.
 *
 * For reading the currently active/selected inspection use the root-level
 * {@link ActiveInspectionStore} instead.
 *
 * A non-conformity status write distinguishes the endpoint's two success
 * statuses through `InspectionService`'s `UpdateNonConformityStatusResult`:
 * a plain `200` replaces the cached row, a `202` (waiving above the
 * organization's approval threshold) leaves it untouched and records the
 * pending request in {@link InspectionState.nonConformityWaivePending}
 * instead, keyed by non-conformity id. A `409` (the `done`/`waived`
 * immutable-terminal-status conflict) refreshes the row rather than
 * dispatching a generic failure toast. Every status-write failure is
 * attributed to its row through {@link InspectionState.nonConformityStatusErrorId},
 * so a consumer can render the message inline under the offending row
 * instead of a page-wide banner nothing ties to a specific record.
 *
 * @example
 * ```typescript
 * @Component({ providers: [InspectionStore] })
 * export class InspectionListPage {
 *   readonly store = inject<InspectionStore>(InspectionStore);
 * }
 * ```
 *
 * @version 2.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InspectionStore = signalStore(
  //#region Features
  withEntities({ entity: type<InspectionOutput>(), collection: 'inspection' }),
  withEntities({ entity: type<NonConformityOutput>(), collection: 'nonConformity' }),
  withState<InspectionState>(INITIAL_INSPECTION_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common derived state
   * related to the inspection list and its operations.
   *
   * @since 1.0.0
   */
  withComputed((store) => {
    const activeInspectionStore: ActiveInspectionStore =
      inject<ActiveInspectionStore>(ActiveInspectionStore);

    return {
      /** All cached inspections from the entity collection. */
      inspections: computed<ReadonlyArray<InspectionOutput>>(() => store.inspectionEntities()),

      /** All cached non-conformities from the entity collection. */
      nonConformities: computed<ReadonlyArray<NonConformityOutput>>(() =>
        store.nonConformityEntities(),
      ),

      /**
       * Normalized error from the last failed list load, or `null` when the load
       * is idle, pending or successful. Lets the page distinguish a failed fetch
       * from a legitimately empty collection.
       */
      listError: computed<StoreError | null>(() => {
        const state = store.listCallState();

        return isCallError(state) ? state.error : null;
      }),

      /**
       * True only when the collection is empty and the last list load neither is
       * in flight nor failed — a failed load surfaces an error, not the empty
       * state.
       */
      isEmpty: computed<boolean>(() => {
        const status = store.listCallState().status;

        return store.inspectionIds().length === 0 && status !== 'pending' && status !== 'error';
      }),

      /** Proxied from {@link ActiveInspectionStore}. */
      selectedInspection: computed<InspectionOutput | null>(() =>
        activeInspectionStore.selectedInspection(),
      ),

      /** True while the inspection list is loading. */
      isLoadingInspections: computed<boolean>(() => store.listCallState().status === 'pending'),

      /** Proxied from {@link ActiveInspectionStore}. */
      isLoadingInspection: computed<boolean>(() => activeInspectionStore.isLoadingInspection()),

      /** True while a create operation is in-flight. */
      isCreating: computed<boolean>(() => store.createCallState().status === 'pending'),

      /** True while an update operation is in-flight. */
      isUpdating: computed<boolean>(() => store.updateCallState().status === 'pending'),

      /** True while a cancellation is in-flight. */
      isCancelling: computed<boolean>(() => store.cancelCallState().status === 'pending'),

      /** True while an inspection lifecycle transition is in-flight. */
      isChangingLifecycle: computed<boolean>(
        () =>
          store.submitCallState().status === 'pending' ||
          store.closeCallState().status === 'pending' ||
          store.cancelCallState().status === 'pending',
      ),

      /** True while the inspection non-conformity list is loading. */
      isLoadingNonConformities: computed<boolean>(
        () => store.nonConformitiesListCallState().status === 'pending',
      ),

      /** True while a non-conformity is being added. */
      isAddingNonConformity: computed<boolean>(
        () => store.addNonConformityCallState().status === 'pending',
      ),

      /** True while a non-conformity status is being updated. */
      isUpdatingNonConformity: computed<boolean>(
        () => store.updateNonConformityStatusCallState().status === 'pending',
      ),

      /**
       * Property nonConformityStatusErrorText
       * @readonly
       *
       * @description
       * Specific, actionable copy for the last status-write failure, or
       * `null` when it did not fail. `null` while pending or idle too, so
       * the caller reads it only alongside {@link isUpdatingNonConformity}
       * settling to `false`.
       *
       * @access public
       * @since 1.1.0
       * @type {Signal<string | null>}
       */
      nonConformityStatusErrorText: computed<string | null>(() => {
        const error: StoreError | null = store.updateNonConformityStatusCallState().error;

        return error ? nonConformityStatusErrorMessage(error) : null;
      }),

      /** Error from the last create operation, if any. */
      createError: computed<StoreError | null>(() => store.createCallState().error),

      /**
       * Property updateError
       *
       * @description
       * Error from the last update operation, if any. Exposed so the edit page can
       * hand a 422 back to the form and land it on the field the server refused.
       *
       * @since 1.1.0
       *
       * @type {StoreError | null}
       */
      updateError: computed<StoreError | null>(() => store.updateCallState().error),
    };
  }),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the inspection list, including
   * loading, creating, submitting, closing, non-conformities, and resetting operations.
   *
   * @since 1.0.0
   */
  //#region Methods
  withMethods(
    (
      store,
      activeInspectionStore: ActiveInspectionStore = inject<ActiveInspectionStore>(
        ActiveInspectionStore,
      ),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      inspectionService: InspectionService = inject<InspectionService>(InspectionService),
    ) => {
      /**
       * Constant loadFn
       * @const loadFn
       *
       * @description
       * Shared rxMethod implementation for loading a paginated inspection list.
       * Uses `switchMap` so that a new request cancels any previous in-flight one.
       *
       * @since 2.0.0
       */
      const loadFn = rxMethod<{ organizationId: string; options?: InspectionListOptions }>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, options }) =>
            inspectionService.list(organizationId, options).pipe(
              tapResponse({
                next: (response: HydraCollection<InspectionOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'inspection' }),
                    {
                      totalInspections: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    inspectionStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load inspections'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      /**
       * Constant loadNonConformityFn
       * @const loadNonConformityFn
       *
       * @description
       * Shared rxMethod implementation for re-reading one non-conformity and
       * replacing its cached row. Exposed as {@link loadNonConformity} and
       * also called internally by {@link updateNonConformityStatusFn} on a
       * 409 — `done`/`waived` is immutable, so a reopen attempt means the
       * cached row is already stale and must be refreshed from the server.
       *
       * @since 1.1.0
       */
      const loadNonConformityFn = rxMethod<{
        organizationId: string;
        inspectionId: string;
        nonConformityId: string;
      }>(
        pipe(
          tap((): void => {
            patchState(store, { nonConformityGetCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, inspectionId, nonConformityId }) =>
            inspectionService.getNonConformity(organizationId, inspectionId, nonConformityId).pipe(
              tapResponse({
                next: (nonConformity: NonConformityOutput): void => {
                  patchState(store, setEntity(nonConformity, { collection: 'nonConformity' }), {
                    nonConformityGetCallState: successCallState(nonConformity),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { nonConformityGetCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    inspectionStoreEvents.nonConformityGetFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load non-conformity'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      /**
       * Constant updateNonConformityStatusFn
       * @const updateNonConformityStatusFn
       *
       * @description
       * Shared rxMethod implementation for a non-conformity status write.
       * `exhaustMap` prevents a concurrent submission. Branches on
       * {@link UpdateNonConformityStatusResult.kind}: `updated` replaces the
       * cached row and clears any stale pending-waiver entry for it;
       * `pendingApproval` leaves the row untouched and records the pending
       * waiver under {@link InspectionState.nonConformityWaivePending}
       * instead. A `409` (the immutable-terminal-status conflict) refreshes
       * the row via {@link loadNonConformityFn} rather than dispatching the
       * generic failure toast — {@link InspectionStore.nonConformityStatusErrorText}
       * carries the specific copy for it instead. A failure sets
       * {@link InspectionState.nonConformityStatusErrorId} to the failed
       * row's id, cleared on any success or the moment a new write starts
       * on that same id — never on a write starting for a different row, so
       * one row's error survives while another is edited.
       *
       * @since 1.1.0
       */
      const updateNonConformityStatusFn = rxMethod<{
        organizationId: string;
        inspectionId: string;
        nonConformityId: string;
        input: UpdateNonConformityStatusInput;
      }>(
        pipe(
          tap(({ nonConformityId }): void => {
            patchState(store, {
              updateNonConformityStatusCallState: pendingCallState(),
              nonConformityStatusErrorId:
                store.nonConformityStatusErrorId() === nonConformityId
                  ? null
                  : store.nonConformityStatusErrorId(),
            });
          }),
          exhaustMap(({ organizationId, inspectionId, nonConformityId, input }) =>
            inspectionService
              .updateNonConformityStatus(organizationId, inspectionId, nonConformityId, input)
              .pipe(
                tapResponse({
                  next: (result: UpdateNonConformityStatusResult): void => {
                    if (result.kind === 'pendingApproval') {
                      patchState(store, {
                        nonConformityWaivePending: {
                          ...store.nonConformityWaivePending(),
                          [nonConformityId]: result.pending,
                        },
                        nonConformityStatusErrorId: null,
                        updateNonConformityStatusCallState: successCallState(null),
                      });

                      return;
                    }

                    const remainingPending: Record<string, NonConformityWaivePendingOutput> = {
                      ...store.nonConformityWaivePending(),
                    };
                    delete remainingPending[nonConformityId];

                    patchState(
                      store,
                      setEntity(result.nonConformity, { collection: 'nonConformity' }),
                      {
                        nonConformityWaivePending: remainingPending,
                        nonConformityStatusErrorId: null,
                        updateNonConformityStatusCallState: successCallState(result.nonConformity),
                      },
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      updateNonConformityStatusCallState: errorCallState(storeError),
                      nonConformityStatusErrorId: nonConformityId,
                    });

                    if (storeError.code === 409) {
                      loadNonConformityFn({ organizationId, inspectionId, nonConformityId });

                      return;
                    }

                    dispatcher.dispatch(
                      inspectionStoreEvents.updateNonConformityStatusFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to update non-conformity status',
                        ),
                      ),
                    );
                  },
                }),
              ),
          ),
        ),
      );

      return {
        // ── Inspection List ────────────────────────────────────────────────────

        /** Fetches one page of inspections. Alias: {@link loadInspections}. */
        load: loadFn,

        /** Alias for {@link load} — kept for backward-compatibility. */
        loadInspections: loadFn,

        // ── Inspection CRUD ────────────────────────────────────────────────────

        /**
         * Method create
         * @method create
         *
         * @description
         * Creates a new inspection via the API. Uses `exhaustMap` to prevent
         * concurrent submissions.
         *
         * @since 1.0.0
         */
        create: rxMethod<{ organizationId: string; input: CreateInspectionInput }>(
          pipe(
            tap((): void => {
              patchState(store, { createCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, input }) =>
              inspectionService.create(organizationId, input).pipe(
                tapResponse({
                  next: (inspection: InspectionOutput): void => {
                    patchState(store, addEntity(inspection, { collection: 'inspection' }), {
                      totalInspections: store.totalInspections() + 1,
                      createCallState: successCallState(inspection),
                    });
                    dispatcher.dispatch(
                      inspectionStoreEvents.createSucceeded(
                        successFeedback($localize`:@@inspection.toast.created:Inspection created`),
                      ),
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { createCallState: errorCallState(storeError) });
                    // Quota (409) failures are surfaced by the page as an
                    // actionable upgrade dialog, not as a generic error toast.
                    if (!isQuotaExceededError(storeError)) {
                      dispatcher.dispatch(
                        inspectionStoreEvents.createFailed(
                          toStoreFailureEventPayload(storeError, 'Failed to create inspection'),
                        ),
                      );
                    }
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Updates a draft inspection and synchronizes the active inspection.
         */
        update: rxMethod<{
          organizationId: string;
          inspectionId: string;
          input: UpdateInspectionInput;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { updateCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId, input }) =>
              inspectionService.update(organizationId, inspectionId, input).pipe(
                tapResponse({
                  next: (inspection: InspectionOutput): void => {
                    patchState(store, setEntity(inspection, { collection: 'inspection' }), {
                      updateCallState: successCallState(inspection),
                    });
                    activeInspectionStore.setInspection(inspection);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { updateCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.updateFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to update inspection'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Cancels an inspection and removes it from the local collection.
         */
        cancel: rxMethod<{ organizationId: string; inspectionId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { cancelCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId }) =>
              inspectionService.cancel(organizationId, inspectionId).pipe(
                tapResponse({
                  next: (): void => {
                    patchState(store, removeEntity(inspectionId, { collection: 'inspection' }), {
                      totalInspections: Math.max(0, store.totalInspections() - 1),
                      cancelCallState: successCallState(inspectionId),
                    });
                    if (activeInspectionStore.selectedInspection()?.id === inspectionId) {
                      activeInspectionStore.clearSelectedInspection();
                    }
                    dispatcher.dispatch(
                      inspectionStoreEvents.cancelSucceeded(
                        successFeedback(
                          $localize`:@@inspection.toast.cancelled:Inspection cancelled`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { cancelCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.cancelFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to cancel inspection'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Inspection Lifecycle ───────────────────────────────────────────────

        /**
         * Method submit
         * @method submit
         *
         * @description
         * Submits an inspection. Uses `exhaustMap` to prevent concurrent
         * submissions. On success, updates the entity in the collection
         * and synchronises the {@link ActiveInspectionStore}.
         *
         * @since 1.0.0
         */
        submit: rxMethod<{ organizationId: string; inspectionId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { submitCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId }) =>
              inspectionService.submit(organizationId, inspectionId).pipe(
                tapResponse({
                  next: (inspection: InspectionOutput): void => {
                    patchState(store, setEntity(inspection, { collection: 'inspection' }), {
                      submitCallState: successCallState(inspection),
                    });
                    activeInspectionStore.setInspection(inspection);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { submitCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.submitFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to submit inspection'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method close
         * @method close
         *
         * @description
         * Closes an inspection. Uses `exhaustMap` to prevent concurrent
         * submissions. On success, updates the entity in the collection
         * and synchronises the {@link ActiveInspectionStore}.
         *
         * @since 1.0.0
         */
        close: rxMethod<{ organizationId: string; inspectionId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { closeCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId }) =>
              inspectionService.close(organizationId, inspectionId).pipe(
                tapResponse({
                  next: (inspection: InspectionOutput): void => {
                    patchState(store, setEntity(inspection, { collection: 'inspection' }), {
                      closeCallState: successCallState(inspection),
                    });
                    activeInspectionStore.setInspection(inspection);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { closeCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.closeFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to close inspection'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Non-Conformities ─────────────────────────────────────────────────

        /**
         * Method loadNonConformities
         * @method loadNonConformities
         *
         * @description
         * Loads paginated non-conformities for a given inspection.
         * Uses `switchMap` to cancel any previous in-flight request.
         *
         * @since 1.0.0
         */
        loadNonConformities: rxMethod<{
          organizationId: string;
          inspectionId: string;
          options?: NonConformityListOptions;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { nonConformitiesListCallState: pendingCallState() });
            }),
            switchMap(({ organizationId, inspectionId, options }) =>
              inspectionService.listNonConformities(organizationId, inspectionId, options).pipe(
                tapResponse({
                  next: (response: HydraCollection<NonConformityOutput>): void => {
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'nonConformity' }),
                      {
                        totalNonConformities: response.totalItems,
                        nonConformitiesListCallState: successCallState(null),
                      },
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { nonConformitiesListCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.nonConformitiesListFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load non-conformities'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /** Re-reads one non-conformity and replaces its cached row. See {@link loadNonConformityFn}. */
        loadNonConformity: loadNonConformityFn,

        /**
         * Method addNonConformity
         * @method addNonConformity
         *
         * @description
         * Adds a non-conformity to an inspection. Uses `exhaustMap` to
         * prevent concurrent submissions.
         *
         * @since 1.0.0
         */
        addNonConformity: rxMethod<{
          organizationId: string;
          inspectionId: string;
          input: AddNonConformityInput;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { addNonConformityCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId, input }) =>
              inspectionService.addNonConformity(organizationId, inspectionId, input).pipe(
                tapResponse({
                  next: (nonConformity: NonConformityOutput): void => {
                    patchState(store, addEntity(nonConformity, { collection: 'nonConformity' }), {
                      totalNonConformities: store.totalNonConformities() + 1,
                      addNonConformityCallState: successCallState(nonConformity),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { addNonConformityCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.addNonConformityFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to add non-conformity'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /** Writes a non-conformity status change. See {@link updateNonConformityStatusFn}. */
        updateNonConformityStatus: updateNonConformityStatusFn,

        // ── Sync Helpers ───────────────────────────────────────────────────────

        /** Resets the create operation back to its idle state. */
        resetCreateOperation(): void {
          patchState(store, { createCallState: idleCallState() });
        },

        /** Resets the add non-conformity operation back to its idle state, for the dialog's close/reopen. */
        resetAddNonConformityOperation(): void {
          patchState(store, { addNonConformityCallState: idleCallState() });
        },

        /** Resets the update non-conformity status operation back to its idle state. */
        resetUpdateNonConformityStatusOperation(): void {
          patchState(store, { updateNonConformityStatusCallState: idleCallState() });
        },
      };
    },
  ),
  //#endregion
);

/**
 * Type InspectionStore
 * @type InspectionStore
 *
 * @description
 * Instance type of the {@link InspectionStore} signal store.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type InspectionStore = InstanceType<typeof InspectionStore>;
