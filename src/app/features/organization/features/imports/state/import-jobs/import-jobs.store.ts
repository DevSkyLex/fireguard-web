import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeAllEntities,
  setEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  Subject,
  exhaustMap,
  finalize,
  mergeMap,
  pipe,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/request-state';
import { ImportJobService } from '@features/organization/features/imports/data-access';
import type {
  ImportJobKind,
  ImportJobListQuery,
  ImportJobOutput,
} from '@features/organization/features/imports/models';
import type { ImportJobsState } from './models';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seeds the auxiliary state managed in {@link ImportJobsState}. Entity state
 * is initialised by `withEntities`.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: ImportJobsState = {
  listCallState: idleCallState(),
  totalJobs: 0,
  visibleIds: [],
  pollCallStates: {},
  createCallState: idleCallState(),
};

/**
 * Store ImportJobsStore
 * @const ImportJobsStore
 *
 * @description
 * Component-scoped NgRx SignalStore for one organization's import jobs: the
 * paginated job list and submitting a new CSV upload. Entity state is
 * `withEntities<ImportJobOutput>({ collection: 'job' })`, so a live poll
 * emission or a `refresh` replaces exactly one row (`setEntity`) — never a
 * refetch of the whole list. {@link create}'s success starts {@link poll}
 * immediately, so the new row updates in place on the same table the reader
 * is looking at; `mergeMap` in {@link poll} lets several jobs poll
 * independently rather than one cancelling the previous. A poll's own error
 * (network failure mid-poll) is swallowed rather than surfaced on a
 * `CallState`: the row simply keeps its last known state, and the page's
 * manual refresh is the recovery path — there is no dedicated poll failure
 * copy to show.
 *
 * @example
 * ```typescript
 * @Component({ providers: [ImportJobsStore] })
 * export class ImportsPage {
 *   protected readonly store = inject(ImportJobsStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ImportJobsStore = signalStore(
  withEntities({ entity: type<ImportJobOutput>(), collection: 'job' }),

  withState<ImportJobsState>(INITIAL_STATE),

  withComputed((store) => ({
    /** All cached jobs from the entity collection, in insertion order. */
    jobs: computed<ReadonlyArray<ImportJobOutput>>(() =>
      store
        .visibleIds()
        .flatMap((id) => (store.jobEntityMap()[id] ? [store.jobEntityMap()[id]] : [])),
    ),

    /** True while the list is loading. */
    isLoading: computed<boolean>(() => isCallPending(store.listCallState())),

    /** True when the collection is empty and no list request is in flight. */
    isEmpty: computed<boolean>(
      () => store.visibleIds().length === 0 && !isCallPending(store.listCallState()),
    ),

    /** True when the last list request failed. */
    hasListError: computed<boolean>(() => store.listCallState().status === 'error'),

    /** True when the last list request was refused for lack of permission, which a retry cannot fix. */
    isListForbidden: computed<boolean>(() => store.listCallState().error?.code === 403),

    /** True while an upload submission is in flight. */
    isCreating: computed<boolean>(() => isCallPending(store.createCallState())),

    /** The last upload submission's normalized failure message, or `null`. */
    createError: computed<string | null>(() => store.createCallState().error?.message ?? null),
  })),

  withMethods((store, service: ImportJobService = inject(ImportJobService)) => {
    let organization = '';
    let lastQuery: {
      organizationId: string;
      options?: RequestOptions;
      query?: ImportJobListQuery;
    } | null = null;
    const changedOrganization = new Subject<void>();
    const activePolls = new Set<string>();
    const poll = rxMethod<ImportJobOutput>(
      pipe(
        mergeMap((job) => {
          if (activePolls.has(job.id) || !['pending', 'processing'].includes(job.status))
            return EMPTY;
          const scope = organization;
          activePolls.add(job.id);
          patchState(store, {
            pollCallStates: { ...store.pollCallStates(), [job.id]: pendingCallState() },
          });
          return service.pollJob(job).pipe(
            takeUntil(changedOrganization),
            tapResponse({
              next: (polled) => {
                if (scope === organization)
                  patchState(store, setEntity(polled, { collection: 'job' }), {
                    pollCallStates: {
                      ...store.pollCallStates(),
                      [job.id]: ['pending', 'processing'].includes(polled.status)
                        ? pendingCallState()
                        : successCallState(null),
                    },
                  });
              },
              error: (error: unknown) => {
                if (scope === organization)
                  patchState(store, {
                    pollCallStates: {
                      ...store.pollCallStates(),
                      [job.id]: errorCallState(toStoreError(error)),
                    },
                  });
              },
            }),
            finalize(() => {
              activePolls.delete(job.id);
              if (scope === organization && store.pollCallStates()[job.id]?.status === 'pending')
                patchState(store, {
                  pollCallStates: {
                    ...store.pollCallStates(),
                    [job.id]: errorCallState(
                      toStoreError(
                        new Error(
                          $localize`:@@imports.poll.interrupted:Tracking stopped before a final result. Refresh this report to check the job.`,
                        ),
                      ),
                    ),
                  },
                });
            }),
          );
        }),
      ),
    );

    const load = rxMethod<{
      organizationId: string;
      options?: RequestOptions;
      query?: ImportJobListQuery;
    }>(
      pipe(
        tap((request): void => {
          if (organization !== request.organizationId) {
            changedOrganization.next();
            activePolls.clear();
            organization = request.organizationId;
            patchState(store, removeAllEntities({ collection: 'job' }), INITIAL_STATE);
          }
          lastQuery = request;
          patchState(store, { listCallState: pendingCallState() });
        }),
        switchMap(({ organizationId, options, query }) =>
          service.list(organizationId, options, query).pipe(
            tapResponse({
              next: (response: HydraCollection<ImportJobOutput>): void => {
                patchState(store, setEntities([...response.member], { collection: 'job' }), {
                  visibleIds: response.member.map((job) => job.id),
                  totalJobs: response.totalItems,
                  listCallState: successCallState(null),
                });
                for (const job of response.member) poll(job);
              },
              error: (error: unknown): void => {
                patchState(store, { listCallState: errorCallState(toStoreError(error)) });
              },
            }),
          ),
        ),
      ),
    );

    const create = rxMethod<{
      organizationId: string;
      kind: ImportJobKind;
      file: File;
      dryRun?: boolean;
    }>(
      pipe(
        tap((): void => {
          patchState(store, { createCallState: pendingCallState() });
        }),
        exhaustMap(({ organizationId, kind, file, dryRun }) =>
          service.create(organizationId, kind, file, dryRun).pipe(
            tapResponse({
              next: (job: ImportJobOutput): void => {
                if (organization && organization !== organizationId) return;
                patchState(store, addEntity(job, { collection: 'job' }), {
                  createCallState: successCallState(job),
                });
                poll(job);
                if (lastQuery) load(lastQuery);
              },
              error: (error: unknown): void => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { createCallState: errorCallState(storeError) });
              },
            }),
          ),
        ),
      ),
    );

    return {
      poll,
      load,
      create,

      /**
       * Method refresh
       * @method refresh
       *
       * @description Re-reads one job and replaces its cached row, for a manual retry.
       * @access public
       * @since 1.0.0
       * @param {string} jobId - The job to re-read.
       * @returns {void}
       */
      refresh: rxMethod<string>(
        pipe(
          mergeMap((jobId) => {
            const scope = organization;
            patchState(store, {
              pollCallStates: { ...store.pollCallStates(), [jobId]: pendingCallState() },
            });
            return service.get(jobId).pipe(
              takeUntil(changedOrganization),
              tapResponse({
                next: (job) => {
                  if (scope !== organization) return;
                  patchState(store, setEntity(job, { collection: 'job' }), {
                    pollCallStates: { ...store.pollCallStates(), [jobId]: successCallState(null) },
                  });
                  poll(job);
                },
                error: (error: unknown) => {
                  if (scope === organization)
                    patchState(store, {
                      pollCallStates: {
                        ...store.pollCallStates(),
                        [jobId]: errorCallState(toStoreError(error)),
                      },
                    });
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method resetCreateOperation
       * @description Resets the upload submission back to idle, for the form's next attempt.
       * @access public
       * @since 1.0.0
       * @returns {void}
       */
      resetCreateOperation(): void {
        patchState(store, { createCallState: idleCallState() });
      },
    };
  }),
);

/**
 * Type ImportJobsStoreType
 * @type ImportJobsStoreType
 *
 * @description Instance type of the {@link ImportJobsStore} signal store.
 * @since 1.0.0
 */
export type ImportJobsStoreType = InstanceType<typeof ImportJobsStore>;
