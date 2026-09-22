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
import { Dispatcher } from '@ngrx/signals/events';
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
import { importJobsStoreEvents } from './events/events';
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
  resumeCallStates: {},
  confirmCallStates: {},
  templateCallState: idleCallState(),
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

  withMethods(
    (
      store,
      service: ImportJobService = inject(ImportJobService),
      dispatcher = inject(Dispatcher),
    ) => {
      let organization = '';
      let organizationGeneration = 0;
      const activeCreates = new Set<number>();
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
              organizationGeneration += 1;
              organization = request.organizationId;
              changedOrganization.next();
              activePolls.clear();
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

      /**
       * Method create
       * @method create
       * @description Accepts one upload per organization generation. An already accepted upload
       * keeps its subscription across context changes, but its result cannot affect a later visit.
       * @access public
       * @since 1.0.0
       * @param {object} request - The organization, import kind, file and optional dry-run choice.
       * @returns {void}
       */
      const create = rxMethod<{
        organizationId: string;
        kind: ImportJobKind;
        file: File;
        dryRun?: boolean;
      }>(
        pipe(
          mergeMap(({ organizationId, kind, file, dryRun }) => {
            if (!organization) {
              organization = organizationId;
              organizationGeneration += 1;
            }
            if (organization !== organizationId || activeCreates.has(organizationGeneration))
              return EMPTY;
            const generation = organizationGeneration;
            activeCreates.add(generation);
            patchState(store, { createCallState: pendingCallState() });
            return service.create(organizationId, kind, file, dryRun).pipe(
              tapResponse({
                next: (job: ImportJobOutput): void => {
                  if (generation !== organizationGeneration || organization !== organizationId)
                    return;
                  patchState(store, addEntity(job, { collection: 'job' }), {
                    createCallState: successCallState(job),
                  });
                  poll(job);
                  dispatcher.dispatch(
                    importJobsStoreEvents.reportReady({ organizationId, jobId: job.id }),
                  );
                  if (lastQuery) load(lastQuery);
                },
                error: (error: unknown): void => {
                  if (generation !== organizationGeneration || organization !== organizationId)
                    return;
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                },
              }),
              finalize(() => activeCreates.delete(generation)),
            );
          }),
        ),
      );

      return {
        poll,
        load,
        create,

        /**
         * Method confirm
         * @description Serializes confirmation locally; the server retains the confirmation across retries.
         * @access public
         * @since 1.1.0
         * @type {RxMethod<string>}
         */
        confirm: rxMethod<string>(
          pipe(
            mergeMap((simulationId) => {
              const source = store.jobEntityMap()[simulationId];
              if (
                !source?.canConfirm ||
                store.confirmCallStates()[simulationId]?.status === 'pending'
              )
                return EMPTY;
              const scope = organization;
              patchState(store, {
                confirmCallStates: {
                  ...store.confirmCallStates(),
                  [simulationId]: pendingCallState(),
                },
              });
              return service.confirm(simulationId).pipe(
                takeUntil(changedOrganization),
                tapResponse({
                  next: (job) => {
                    if (scope !== organization) return;
                    patchState(
                      store,
                      setEntity(job, { collection: 'job' }),
                      setEntity<ImportJobOutput, 'job'>(
                        { ...source, canConfirm: false, confirmedJobId: job.id },
                        { collection: 'job' },
                      ),
                      {
                        confirmCallStates: {
                          ...store.confirmCallStates(),
                          [simulationId]: successCallState(null),
                        },
                      },
                    );
                    poll(job);
                    dispatcher.dispatch(
                      importJobsStoreEvents.reportReady({ organizationId: scope, jobId: job.id }),
                    );
                    if (lastQuery) load(lastQuery);
                  },
                  error: (error: unknown) => {
                    if (scope !== organization) return;
                    const normalized = toStoreError(error);
                    patchState(store, {
                      confirmCallStates: {
                        ...store.confirmCallStates(),
                        [simulationId]: errorCallState({
                          ...normalized,
                          message: $localize`:@@imports.confirm.error:The import could not be confirmed. Check the latest report or retry; an accepted confirmation will return the same import.`,
                        }),
                      },
                    });
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method downloadTemplate
         * @description Emits a requested CSV download only while its organization is still active.
         * @access public
         * @since 1.1.0
         * @type {RxMethod<ImportJobKind>}
         */
        downloadTemplate: rxMethod<ImportJobKind>(
          pipe(
            exhaustMap((kind) => {
              const scope = organization;
              if (!scope) return EMPTY;
              patchState(store, { templateCallState: pendingCallState() });
              return service.template(scope, kind).pipe(
                takeUntil(changedOrganization),
                tapResponse({
                  next: (template) => {
                    if (scope !== organization) return;
                    patchState(store, { templateCallState: successCallState(null) });
                    dispatcher.dispatch(
                      importJobsStoreEvents.templateReady({ organizationId: scope, template }),
                    );
                  },
                  error: (error: unknown) => {
                    if (scope === organization)
                      patchState(store, { templateCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
            }),
          ),
        ),

        /** Resumes only the existing server job; a rejected request keeps its last confirmed report. */
        resume: rxMethod<string>(
          pipe(
            mergeMap((jobId) => {
              const job = store.jobEntityMap()[jobId];
              if (!job?.canResume || store.resumeCallStates()[jobId]?.status === 'pending')
                return EMPTY;
              const scope = organization;
              patchState(store, {
                resumeCallStates: { ...store.resumeCallStates(), [jobId]: pendingCallState() },
              });
              return service.resume(jobId).pipe(
                takeUntil(changedOrganization),
                tapResponse({
                  next: (resumed) => {
                    if (scope !== organization) return;
                    patchState(store, setEntity(resumed, { collection: 'job' }), {
                      resumeCallStates: {
                        ...store.resumeCallStates(),
                        [jobId]: successCallState(null),
                      },
                    });
                    poll(resumed);
                  },
                  error: (error: unknown) => {
                    if (scope !== organization) return;
                    patchState(store, {
                      resumeCallStates: {
                        ...store.resumeCallStates(),
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
                      pollCallStates: {
                        ...store.pollCallStates(),
                        [jobId]: successCallState(null),
                      },
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
          if (activeCreates.has(organizationGeneration)) return;
          patchState(store, { createCallState: idleCallState() });
        },
      };
    },
  ),
);

/**
 * Type ImportJobsStoreType
 * @type ImportJobsStoreType
 *
 * @description Instance type of the {@link ImportJobsStore} signal store.
 * @since 1.0.0
 */
export type ImportJobsStoreType = InstanceType<typeof ImportJobsStore>;
