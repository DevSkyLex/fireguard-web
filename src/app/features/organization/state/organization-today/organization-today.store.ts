import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, forkJoin, from, map, of, pipe, switchMap, tap, type Observable } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { InterventionService } from '@features/organization/features/interventions';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionListOptions,
  InterventionOutput,
  InterventionQueue,
  InterventionQueueKey,
  InterventionUnsyncedEntry,
} from '@features/organization/features/interventions/models';
import { buildInterventionQueueRequests } from '@features/organization/features/interventions/utils';
import { ActiveOrganizationStore } from '@features/organization/state';
import type { OrganizationTodayQueues, OrganizationTodayState } from './models';

/**
 * Constant QUEUE_PAGE_SIZE
 *
 * @description
 * How many interventions a queue shows. The count beside the heading is the
 * organization-wide total from the Hydra envelope, not this number: the queue
 * shows a handful and says how many there are.
 *
 * @since 1.0.0
 */
const QUEUE_PAGE_SIZE = 4;

/**
 * Constant EMPTY_QUEUE
 *
 * @description
 * The queue a key resolves to before anything is loaded, so the page never has
 * to reason about a missing queue.
 *
 * @since 1.0.0
 */
const EMPTY_QUEUE = (key: InterventionQueueKey): InterventionQueue => ({
  key,
  total: 0,
  items: [],
});

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seed state: both calls idle.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: OrganizationTodayState = {
  queuesCallState: idleCallState(),
  unsyncedCallState: idleCallState(),
};

/**
 * Store OrganizationTodayStore
 * @const OrganizationTodayStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the landing page's work queues.
 *
 * It replaces the count-only attention store: the same requests were already
 * going out with `itemsPerPage=1` so only `totalItems` could be read, which is
 * why the landing page could say *how many* interventions were overdue but
 * never *which*. Asking for a page of four costs the same round trips.
 *
 * The unsynced queue is read from the local outbox rather than the collection,
 * and is loaded separately so it survives a network failure. Its dependency on
 * the offline layer adds no bundle weight here: the workspace shell already
 * mounts the sync chip, which injects the same service.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationTodayStore] })
 * export class OrganizationTodayPage {
 *   protected readonly store = inject(OrganizationTodayStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationTodayStore = signalStore(
  //#region State
  withState<OrganizationTodayState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /** Whether the collection queues are still resolving. */
    isLoading: computed<boolean>(() => isCallPending(store.queuesCallState())),

    /** Whether the collection queues failed. */
    hasError: computed<boolean>(() => isCallError(store.queuesCallState())),

    /** Workable interventions past their due date. */
    overdue: computed<InterventionQueue>(
      () => store.queuesCallState().data?.overdue ?? EMPTY_QUEUE('overdue'),
    ),

    /** Interventions a reviewer sent back. */
    changesRequested: computed<InterventionQueue>(
      () => store.queuesCallState().data?.changesRequested ?? EMPTY_QUEUE('changesRequested'),
    ),

    /** Interventions submitted and waiting for a reviewer. */
    awaitingReview: computed<InterventionQueue>(
      () => store.queuesCallState().data?.awaitingReview ?? EMPTY_QUEUE('awaitingReview'),
    ),

    /** Planned interventions still ahead, nearest deadline first. */
    upcoming: computed<InterventionQueue>(
      () => store.queuesCallState().data?.upcoming ?? EMPTY_QUEUE('upcoming'),
    ),

    /** Interventions with operations still queued locally. */
    unsynced: computed<readonly InterventionUnsyncedEntry[]>(
      () => store.unsyncedCallState().data ?? [],
    ),
  })),

  withComputed((store) => ({
    /**
     * How many things wait on the operator, across every queue. Local work
     * counts: an unsynced intervention is work in progress, not a notification.
     */
    waitingCount: computed<number>(
      () =>
        store.overdue().total +
        store.changesRequested().total +
        store.awaitingReview().total +
        store.unsynced().length,
    ),
  })),

  withComputed((store) => ({
    /**
     * Whether anything is waiting. Deliberately false while the queues are
     * still resolving or after they failed, so the all-clear is only ever
     * claimed on evidence.
     */
    isAllClear: computed<boolean>(
      () => !store.isLoading() && !store.hasError() && store.waitingCount() === 0,
    ),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      interventionService = inject<InterventionService>(InterventionService),
      offline = inject<InterventionOfflineService>(InterventionOfflineService),
    ) => {
      /**
       * Runs every request a named question needs and folds them into one
       * queue. `overdue` spans two statuses because the API filters one at a
       * time, so the totals are summed and the items concatenated.
       */
      const loadQueue = (
        organizationId: string,
        key: InterventionQueueKey,
        now: string,
      ): Observable<InterventionQueue> => {
        const requests: readonly InterventionListOptions[] = buildInterventionQueueRequests(
          key,
          now,
        );
        if (requests.length === 0) return of(EMPTY_QUEUE(key));

        return forkJoin(
          requests.map((options: InterventionListOptions) =>
            interventionService.list(organizationId, { ...options, itemsPerPage: QUEUE_PAGE_SIZE }),
          ),
        ).pipe(
          map((collections: HydraCollection<InterventionOutput>[]): InterventionQueue => {
            const items: readonly InterventionOutput[] = collections
              .flatMap((collection) => collection.member)
              .slice(0, QUEUE_PAGE_SIZE);

            return {
              key,
              total: collections.reduce((sum, collection) => sum + collection.totalItems, 0),
              items,
            };
          }),
        );
      };

      /**
       * Crosses the outbox with the local workspace cache. An id queued for an
       * intervention this device never cached is skipped rather than rendered
       * as a blank row.
       */
      const readUnsynced = async (
        organizationId: string,
      ): Promise<readonly InterventionUnsyncedEntry[]> => {
        const ids: readonly string[] = await offline.listInterventionIdsWithOutbox();
        if (ids.length === 0) return [];

        const cached: readonly InterventionOutput[] =
          await offline.listInterventions(organizationId);
        const byId = new Map<string, InterventionOutput>(
          cached.map((intervention) => [intervention.id, intervention]),
        );

        const known: readonly InterventionOutput[] = ids
          .map((id: string) => byId.get(id))
          .filter((intervention): intervention is InterventionOutput => intervention !== undefined);

        const counts: readonly number[] = await Promise.all(
          known.map(async (intervention) => (await offline.listOutbox(intervention.id)).length),
        );

        return known.map(
          (intervention, index): InterventionUnsyncedEntry => ({
            intervention,
            pendingCount: counts[index] ?? 0,
          }),
        );
      };

      return {
        /**
         * Method load
         *
         * @description
         * Loads the collection-backed queues in parallel for one organization.
         * A missing organization id is a no-op.
         *
         * @access public
         * @since 1.0.0
         *
         * @type {rxMethod<string | undefined>}
         */
        load: rxMethod<string | undefined>(
          pipe(
            switchMap((organizationId: string | undefined) => {
              if (!organizationId) return EMPTY;

              patchState(store, {
                queuesCallState: pendingCallState(store.queuesCallState().data),
              });

              const now: string = new Date().toISOString();

              return forkJoin({
                overdue: loadQueue(organizationId, 'overdue', now),
                changesRequested: loadQueue(organizationId, 'changesRequested', now),
                awaitingReview: loadQueue(organizationId, 'awaitingReview', now),
                upcoming: loadQueue(organizationId, 'upcoming', now),
              }).pipe(
                tapResponse({
                  next: (queues: OrganizationTodayQueues): void => {
                    patchState(store, { queuesCallState: successCallState(queues) });
                  },
                  error: (error: unknown): void => {
                    patchState(store, {
                      queuesCallState: errorCallState(
                        toStoreError(error),
                        store.queuesCallState().data,
                      ),
                    });
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method loadUnsynced
         *
         * @description
         * Reads the local outbox for one organization. Resolves to an empty
         * queue on the server, where IndexedDB does not exist.
         *
         * @access public
         * @since 1.0.0
         *
         * @type {rxMethod<string | undefined>}
         */
        loadUnsynced: rxMethod<string | undefined>(
          pipe(
            tap(() => {
              patchState(store, {
                unsyncedCallState: pendingCallState(store.unsyncedCallState().data),
              });
            }),
            switchMap((organizationId: string | undefined) => {
              if (!organizationId) return EMPTY;

              return from(readUnsynced(organizationId)).pipe(
                tapResponse({
                  next: (entries: readonly InterventionUnsyncedEntry[]): void => {
                    patchState(store, { unsyncedCallState: successCallState(entries) });
                  },
                  error: (error: unknown): void => {
                    patchState(store, {
                      unsyncedCallState: errorCallState(
                        toStoreError(error),
                        store.unsyncedCallState().data,
                      ),
                    });
                  },
                }),
              );
            }),
          ),
        ),
      };
    },
  ),

  /**
   * Feature withComputed (load params)
   *
   * @description
   * Derives the organization id forwarded to both loads. Undefined on the
   * server: the queues are per-operator working state, not first-render
   * content, and IndexedDB does not exist there (ARCHITECTURE.md §12.5).
   *
   * @since 1.0.0
   */
  withComputed((_store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      loadParams: computed<string | undefined>(() => {
        if (!isPlatformBrowser(platformId)) return undefined;

        return activeOrganizationStore.selectedOrganizationId() ?? undefined;
      }),
    };
  }),

  /**
   * Feature withHooks
   *
   * @description
   * Connects {@link loadParams} to both loads on store init, so switching
   * organization refreshes the queues without the page wiring an effect.
   *
   * @since 1.0.0
   */
  withHooks({
    onInit(store) {
      store.load(store.loadParams);
      store.loadUnsynced(store.loadParams);
    },
  }),
  //#endregion
);

/**
 * Type OrganizationTodayStore
 *
 * @description
 * Instance type of the {@link OrganizationTodayStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationTodayStore = InstanceType<typeof OrganizationTodayStore>;
