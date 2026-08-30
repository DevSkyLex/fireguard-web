import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { mergeMap, pipe, switchMap, tap } from 'rxjs';
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
    jobs: computed<ReadonlyArray<ImportJobOutput>>(() => store.jobEntities()),

    /** True while the list is loading. */
    isLoading: computed<boolean>(() => isCallPending(store.listCallState())),

    /** True when the collection is empty and no list request is in flight. */
    isEmpty: computed<boolean>(
      () => store.jobIds().length === 0 && !isCallPending(store.listCallState()),
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
    const poll = rxMethod<ImportJobOutput>(
      pipe(
        mergeMap((job) =>
          service.pollJob(job).pipe(
            tapResponse({
              next: (polled: ImportJobOutput): void => {
                patchState(store, setEntity(polled, { collection: 'job' }));
              },
              error: (): void => undefined,
            }),
          ),
        ),
      ),
    );

    const load = rxMethod<{
      organizationId: string;
      options?: RequestOptions;
      query?: ImportJobListQuery;
    }>(
      pipe(
        tap((): void => {
          patchState(store, { listCallState: pendingCallState() });
        }),
        switchMap(({ organizationId, options, query }) =>
          service.list(organizationId, options, query).pipe(
            tapResponse({
              next: (response: HydraCollection<ImportJobOutput>): void => {
                patchState(store, setAllEntities([...response.member], { collection: 'job' }), {
                  totalJobs: response.totalItems,
                  listCallState: successCallState(null),
                });
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
        switchMap(({ organizationId, kind, file, dryRun }) =>
          service.create(organizationId, kind, file, dryRun).pipe(
            tapResponse({
              next: (job: ImportJobOutput): void => {
                patchState(store, addEntity(job, { collection: 'job' }), {
                  createCallState: successCallState(job),
                });
                poll(job);
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
      refresh(jobId: string): void {
        service.get(jobId).subscribe((job) => {
          patchState(store, setEntity(job, { collection: 'job' }));
        });
      },

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
