import { isPlatformBrowser } from '@angular/common';
import { computed, DOCUMENT, effect, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { withEntities, setAllEntities, removeAllEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, EMPTY, from, map, pipe, switchMap } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
} from '@core/request-state';
import {
  InterventionOfflineService,
  InterventionTimeRepository,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionTimeDraft,
  InterventionTimeEntryView,
  InterventionTimeScope,
  InterventionTimeWrite,
} from '@features/organization/features/interventions/models';
import { InterventionTimeJournalService } from '@features/organization/features/interventions/services/intervention-time-journal';
import { interventionTimeEvents } from './events/events';
import type { InterventionTimePersistenceRequest } from './models/intervention-time-persistence-request.type';
import type { InterventionTimeState } from './models/intervention-time-state.interface';

/**
 * Constant initialState
 *
 * @description
 * An unopened journal has no inferred history or permissions.
 *
 * @since 1.0.0
 *
 * @constant initialState
 */
const initialState: InterventionTimeState = {
  scope: null,
  readCallState: idleCallState(),
  writeCallState: idleCallState(),
  draftCallState: idleCallState(),
  draft: null,
  persistedDraft: null,
  draftPersistenceFailed: false,
  offline: false,
  historyUnavailable: false,
};

/**
 * Function sameDraft
 *
 * @description
 * Compares input content with its durable snapshot so rereading an equivalent object stays safe.
 *
 * @access private
 * @since unreleased
 *
 * @param {InterventionTimeDraft | null} left - Latest input.
 * @param {InterventionTimeDraft | null} right - Confirmed device snapshot.
 *
 * @returns {boolean} Whether both drafts represent the same version of the input.
 */
function sameDraft(
  left: InterventionTimeDraft | null,
  right: InterventionTimeDraft | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.id === right.id &&
      left.memberId === right.memberId &&
      left.workedOn === right.workedOn &&
      left.minutes === right.minutes &&
      left.note === right.note &&
      left.baseRevision === right.baseRevision)
  );
}

/**
 * Constant InterventionTimeStore
 *
 * @description
 * Sheet-scoped time journal with cancellable reads and serialized, durable drafts.
 * Journal writes never reuse an operational revision or reestimate work automatically.
 *
 * @since 1.0.0
 *
 * @constant InterventionTimeStore
 */
export const InterventionTimeStore = signalStore(
  withState<InterventionTimeState>(initialState),
  withEntities<InterventionTimeEntryView>(),
  withComputed((store) => ({
    /**
     * Property hasUnpersistedFailedDraft
     * @readonly
     *
     * @description
     * Distinguishes input at risk on browser close from durable drafts and failed network writes.
     *
     * @access public
     * @since unreleased
     *
     * @type {Signal<boolean>}
     */
    hasUnpersistedFailedDraft: computed(
      () =>
        store.draftPersistenceFailed() &&
        store.draft() !== null &&
        !sameDraft(store.draft(), store.persistedDraft()),
    ),
  })),
  withMethods((store, journal = inject(InterventionTimeJournalService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Opens or refreshes one authorized journal; cancels obsolete reads.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {InterventionTimeScope | null} scope - Selected task or dismissed sheet.
     *
     * @returns {void}
     */
    load: rxMethod<InterventionTimeScope | null>(
      pipe(
        switchMap((scope) => {
          if (!scope) {
            patchState(store, initialState, removeAllEntities());
            return EMPTY;
          }
          const sameTask =
            store.scope()?.workItemId === scope.workItemId &&
            store.scope()?.actorId === scope.actorId;
          if (!sameTask) patchState(store, initialState, removeAllEntities());
          patchState(store, { scope, readCallState: pendingCallState() });
          return journal.read(scope).pipe(
            tapResponse({
              next: (value) =>
                patchState(store, setAllEntities([...value.entries]), {
                  readCallState: successCallState(null),
                  persistedDraft: value.draft,
                  ...(['pending', 'error'].includes(store.draftCallState().status)
                    ? {}
                    : { draft: value.draft }),
                  offline: value.offline,
                  historyUnavailable: value.historyUnavailable,
                }),
              error: (error: unknown) =>
                patchState(store, { readCallState: errorCallState(toStoreError(error)) }),
            }),
          );
        }),
      ),
    ),
  })),
  withMethods(
    (
      store,
      journal = inject(InterventionTimeJournalService),
      dispatcher = inject(Dispatcher),
      repository = inject(InterventionTimeRepository),
      offline = inject(InterventionOfflineService),
    ) => ({
      /**
       * Method _persist
       * @method _persist
       *
       * @description
       * Orders draft saves before submission so a slow local write cannot resurrect a submitted
       * draft.
       *
       * @access private
       * @since 1.0.0
       *
       * @param {InterventionTimePersistenceRequest} request - Captured local intention.
       *
       * @returns {void}
       */
      _persist: rxMethod<InterventionTimePersistenceRequest>(
        pipe(
          map((request) => ({ ...request, owner: offline.publicationOwner() })),
          concatMap((request) => {
            const { scope, owner } = request;
            const current = (): boolean =>
              store.scope()?.workItemId === scope.workItemId &&
              store.scope()?.actorId === scope.actorId &&
              owner === offline.publicationOwner();
            if (request.kind === 'draft') {
              return from(
                request.draft
                  ? repository.saveDraft(
                      {
                        interventionId: scope.interventionId,
                        workItemId: scope.workItemId,
                        draft: request.draft,
                      },
                      owner,
                    )
                  : repository.clearDraft(scope.workItemId, owner),
              ).pipe(
                tapResponse({
                  next: () => {
                    if (current())
                      patchState(store, {
                        persistedDraft: request.draft,
                        ...(store.draft() === request.draft
                          ? {
                              draftCallState: successCallState(null),
                              draftPersistenceFailed: false,
                            }
                          : {}),
                      });
                  },
                  error: (error: unknown) => {
                    if (current() && store.draft() === request.draft)
                      patchState(store, {
                        draftCallState: errorCallState(toStoreError(error)),
                        draftPersistenceFailed: true,
                      });
                  },
                }),
              );
            }
            if (!owner || owner !== offline.publicationOwner()) return EMPTY;
            return journal.write(scope, request.command, owner).pipe(
              tapResponse({
                next: (source) => {
                  if (current()) {
                    patchState(store, {
                      writeCallState: successCallState(null),
                      ...(request.command.kind === 'cancel'
                        ? {}
                        : { draft: null, draftCallState: idleCallState() }),
                    });
                    store.load(scope);
                  }
                  dispatcher.dispatch(interventionTimeEvents.written({ scope, source }));
                },
                error: (error: unknown) => {
                  if (current())
                    patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),
  withMethods((store) => ({
    /**
     * Method write
     * @method write
     *
     * @description
     * Locks submission immediately, then persists after preceding draft writes.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {{
     *   readonly scope: InterventionTimeScope;
     *   readonly command: InterventionTimeWrite;
     * }} request
     *   - Reviewed journal intention.
     *
     * @returns {void}
     */
    write(request: {
      readonly scope: InterventionTimeScope;
      readonly command: InterventionTimeWrite;
    }): void {
      if (store.writeCallState().status === 'pending') return;
      patchState(store, { writeCallState: pendingCallState() });
      store['_persist']({ kind: 'write', ...request });
    },

    /**
     * Method saveDraft
     * @method saveDraft
     *
     * @description
     * Queues durable partial input without dropping intermediate writes.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {{ readonly scope: InterventionTimeScope; readonly draft: InterventionTimeDraft }} request -
     *   Unsaved input.
     *
     * @returns {void}
     */
    saveDraft(request: {
      readonly scope: InterventionTimeScope;
      readonly draft: InterventionTimeDraft | null;
    }): void {
      if (store.writeCallState().status === 'pending') return;
      patchState(store, { draft: request.draft, draftCallState: pendingCallState() });
      store['_persist']({ kind: 'draft', ...request });
    },
  })),
  withHooks((store, document = inject(DOCUMENT), platform = inject(PLATFORM_ID)) => ({
    onInit(): void {
      if (!isPlatformBrowser(platform)) return;
      const view = document.defaultView;
      if (!view) return;
      effect((onCleanup) => {
        if (!store.hasUnpersistedFailedDraft()) return;
        /**
         * Function beforeUnload
         *
         * @description
         * Requests the browser's native warning only while failed local input remains volatile.
         * Browsers may suppress this event or prompt, especially on mobile.
         *
         * @access private
         * @since unreleased
         *
         * @param {BeforeUnloadEvent} event - Browser document departure.
         *
         * @returns {void}
         */
        const beforeUnload = (event: BeforeUnloadEvent): void => {
          if (!store.hasUnpersistedFailedDraft()) return;
          event.preventDefault();
          event.returnValue = '';
        };
        view.addEventListener('beforeunload', beforeUnload);
        onCleanup(() => view.removeEventListener('beforeunload', beforeUnload));
      });
    },
  })),
);

/**
 * Type InterventionTimeStoreType
 *
 * @description
 * Injected independent journal store instance.
 *
 * @since 1.0.0
 *
 * @type InterventionTimeStoreType
 */
export type InterventionTimeStoreType = InstanceType<typeof InterventionTimeStore>;
