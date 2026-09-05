import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, from, merge, of, pipe, exhaustMap, switchMap, tap, timer } from 'rxjs';
import { catchError, ignoreElements, takeUntil } from 'rxjs/operators';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  PublicationOutput,
  PublicationTracking,
} from '@features/organization/features/interventions/models';
import {
  InterventionPublicationService,
  PublicationPollTimeoutError,
} from '@features/organization/features/interventions/services/intervention-publication';
import { interventionPublicationStoreEvents } from './events';
import type { InterventionPublicationState } from './models';

/**
 * Constant INITIAL_STATE
 * @description Idle state before loading account-bound recovery metadata.
 * @since 1.0.0
 * @type {InterventionPublicationState}
 */
const INITIAL_STATE: InterventionPublicationState = {
  publishCallState: idleCallState(),
  publicationId: null,
  longRunning: false,
  timedOut: false,
  tracking: null,
  storageError: null,
  restoreCallState: idleCallState(),
};

/**
 * Store InterventionPublicationStore
 * @description Owns publication launch and observation independently. Accepted identifiers survive observation failures and page revisits.
 * @since 1.0.0
 */
export const InterventionPublicationStore = signalStore(
  withState<InterventionPublicationState>(INITIAL_STATE),
  withComputed((store) => ({
    publishing: computed(() => isCallPending(store.publishCallState())),
    error: computed(() => store.publishCallState().error?.message ?? null),
    unresolved: computed(
      () =>
        store.tracking() !== null &&
        !['completed', 'failed'].includes(store.tracking()?.status ?? ''),
    ),
  })),
  withMethods(
    (
      store,
      dispatcher = inject(Dispatcher),
      publication = inject(InterventionPublicationService),
      offline = inject(InterventionOfflineService),
      isBrowser = isPlatformBrowser(inject(PLATFORM_ID)),
    ) => {
      let scope = '';
      let organization = '';
      let interventionId = '';
      let writeChain: Promise<void> = Promise.resolve();
      inject(DestroyRef).onDestroy(() => {
        scope = '';
      });

      /**
       * Function persist
       * @description Serializes metadata writes so an older observation cannot overwrite a terminal result.
       * @access private
       * @since 1.0.0
       * @param {PublicationTracking} tracking - Last observed state.
       * @returns {Promise<void>}
       */
      const persist = (tracking: PublicationTracking): Promise<void> => {
        const expected = scope;
        const owner = offline.publicationOwner();
        const org = organization;
        const id = interventionId;
        if (!isBrowser || !id) return Promise.resolve();
        writeChain = writeChain
          .then(() =>
            owner === offline.publicationOwner()
              ? offline.savePublicationTracking(org, id, tracking)
              : undefined,
          )
          .catch(() => {
            if (scope === expected)
              patchState(store, {
                storageError: $localize`:@@intervention.publication.storageError:Recovery could not be saved on this device. Keep this page open until the result is confirmed.`,
              });
          });
        return writeChain;
      };

      /**
       * Function settle
       * @description Records a server observation and emits success only for a completed publication.
       * @access private
       * @since 1.0.0
       * @param {PublicationOutput} result - Observed publication.
       * @returns {void}
       */
      const settle = (result: PublicationOutput): void => {
        const previouslyCompleted =
          store.publishCallState().status === 'success' &&
          store.publishCallState().data?.status === 'completed';
        const tracking: PublicationTracking = {
          publicationId: result.id,
          status: result.status,
          checkedAt: Date.now(),
        };
        patchState(store, {
          tracking,
          publicationId: result.id,
          longRunning: false,
          timedOut: false,
        });
        void persist(tracking);
        if (result.status === 'completed') {
          patchState(store, { publishCallState: successCallState(result) });
          if (!previouslyCompleted)
            dispatcher.dispatch(interventionPublicationStoreEvents.publishSucceeded(result));
        } else if (result.status === 'failed') {
          patchState(store, {
            publishCallState: errorCallState(
              toStoreError(
                new Error(
                  result.error ??
                    $localize`:@@intervention.publication.failed:Publication failed without applying partial changes.`,
                ),
              ),
            ),
          });
        } else {
          patchState(store, { publishCallState: successCallState(result), timedOut: true });
        }
      };

      /**
       * Function failObservation
       * @description Keeps accepted identifiers on network failure and treats a lost launch response as unknown.
       * @access private
       * @since 1.0.0
       * @param {unknown} error - Request or observation error.
       * @returns {void}
       */
      const failObservation = (error: unknown): void => {
        const id =
          error instanceof PublicationPollTimeoutError
            ? error.publicationId
            : store.publicationId();
        const normalized = toStoreError(error);
        const unknown =
          id === null &&
          (normalized.code === null ||
            normalized.code === 0 ||
            (typeof normalized.code === 'number' && normalized.code >= 500));
        const tracking: PublicationTracking | null = id
          ? {
              publicationId: id,
              status: store.tracking()?.status === 'processing' ? 'processing' : 'pending',
              checkedAt: store.tracking()?.checkedAt ?? Date.now(),
            }
          : { publicationId: null, status: unknown ? 'unknown' : 'failed', checkedAt: Date.now() };
        patchState(store, {
          tracking,
          publicationId: id,
          longRunning: false,
          timedOut: tracking !== null && tracking.status !== 'failed',
          publishCallState: errorCallState({
            ...normalized,
            message: id
              ? $localize`:@@intervention.publication.observationInterrupted:The result is not confirmed. Check the status of the existing publication.`
              : unknown
                ? $localize`:@@intervention.publication.unknownResult:The publication result is unknown. Refresh the intervention before taking further action.`
                : normalized.message,
          }),
        });
        if (tracking) void persist(tracking);
      };

      return {
        /**
         * Method restore
         * @description Restores only the active intervention's recovery record; stale reads are ignored.
         * @access public
         * @since 1.0.0
         * @param {{ organization: string; interventionId: string }} context - Active scope.
         * @returns {void}
         */
        restore: rxMethod<{ organization: string; interventionId: string }>(
          pipe(
            switchMap((context) => {
              const owner = offline.publicationOwner();
              const next = `${owner}:${context.organization}:${context.interventionId}`;
              if (next === scope) return EMPTY;
              scope = next;
              organization = context.organization;
              interventionId = context.interventionId;
              patchState(store, INITIAL_STATE);
              if (!isBrowser) return EMPTY;
              patchState(store, { restoreCallState: pendingCallState() });
              return from(offline.loadPublicationTracking(organization, interventionId)).pipe(
                tapResponse({
                  next: (tracking) => {
                    if (scope !== next || owner !== offline.publicationOwner()) return;
                    patchState(store, { restoreCallState: successCallState(null) });
                    if (store.tracking() || store.publishing() || !tracking) return;
                    patchState(store, {
                      tracking,
                      publicationId: tracking.publicationId,
                      timedOut: !['completed', 'failed'].includes(tracking.status),
                    });
                  },
                  error: (error: unknown) => {
                    if (scope === next && owner === offline.publicationOwner())
                      patchState(store, {
                        restoreCallState: errorCallState(toStoreError(error)),
                        storageError: $localize`:@@intervention.publication.restoreError:Previous publication tracking could not be read. Refresh before publishing.`,
                      });
                  },
                }),
              );
            }),
          ),
        ),
        /**
         * Method publish
         * @description Launches once, persists the accepted identifier, then observes that publication. Unresolved attempts cannot be posted again.
         * @access public
         * @since 1.0.0
         * @param {InterventionOutput} intervention - Revision to publish.
         * @returns {void}
         */
        publish: rxMethod<InterventionOutput>(
          pipe(
            exhaustMap((intervention) => {
              if (
                store.unresolved() ||
                ['pending', 'error'].includes(store.restoreCallState().status)
              )
                return EMPTY;
              organization = intervention.organization;
              interventionId = intervention.id;
              const owner = offline.publicationOwner();
              scope = `${owner}:${organization}:${interventionId}`;
              const expected = scope;
              patchState(store, { ...INITIAL_STATE, publishCallState: pendingCallState() });
              const result = (async (): Promise<PublicationOutput> => {
                await persist({ publicationId: null, status: 'unknown', checkedAt: Date.now() });
                if (scope !== expected || owner !== offline.publicationOwner())
                  throw new Error('Publication context changed before launch.');
                const accepted = await publication.start(intervention);
                if (scope !== expected && owner === offline.publicationOwner()) {
                  await offline.savePublicationTracking(
                    intervention.organization,
                    intervention.id,
                    { publicationId: accepted.id, status: accepted.status, checkedAt: Date.now() },
                  );
                  return accepted;
                }
                if (scope === expected) {
                  const tracking: PublicationTracking = {
                    publicationId: accepted.id,
                    status: accepted.status,
                    checkedAt: Date.now(),
                  };
                  patchState(store, { tracking, publicationId: accepted.id });
                  await persist(tracking);
                }
                return publication.observe(accepted);
              })();
              const result$ = from(result);
              const slow$ = isBrowser
                ? timer(30_000).pipe(
                    tap(() => {
                      if (scope === expected) patchState(store, { longRunning: true });
                    }),
                    takeUntil(result$.pipe(catchError(() => of(null)))),
                    ignoreElements(),
                  )
                : EMPTY;
              return merge(
                slow$,
                result$.pipe(
                  tapResponse({
                    next: (value) => {
                      if (scope === expected) settle(value);
                    },
                    error: (error: unknown) => {
                      if (scope === expected) failObservation(error);
                    },
                  }),
                ),
              );
            }),
          ),
        ),
        /**
         * Method recheck
         * @description Reads the existing publication without starting another operation.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        recheck: rxMethod<void>(
          pipe(
            exhaustMap(() => {
              const id = store.publicationId();
              if (!id || store.publishing()) return EMPTY;
              const expected = scope;
              patchState(store, { publishCallState: pendingCallState() });
              return from(publication.checkStatus(id)).pipe(
                tapResponse({
                  next: (value) => {
                    if (scope === expected) settle(value);
                  },
                  error: (error: unknown) => {
                    if (scope === expected) failObservation(error);
                  },
                }),
              );
            }),
          ),
        ),
        /**
         * Method reconcilePublished
         * @description Reconciles a previously unknown result with a freshly loaded published intervention.
         * @param {InterventionOutput} intervention - Fresh server representation.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        reconcilePublished(intervention: InterventionOutput): void {
          if (
            intervention.id !== interventionId ||
            intervention.organization !== organization ||
            intervention.status !== 'published' ||
            !store.unresolved()
          )
            return;
          const tracking: PublicationTracking = {
            publicationId: store.publicationId(),
            status: 'completed',
            checkedAt: Date.now(),
          };
          patchState(store, {
            tracking,
            timedOut: false,
            longRunning: false,
            publishCallState: idleCallState(),
          });
          void persist(tracking);
        },
        /**
         * Method reset
         * @method reset
         * @description Clears resolved feedback while retaining unresolved publication tracking.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        reset(): void {
          if (!store.unresolved() && !store.publishing()) patchState(store, INITIAL_STATE);
        },
      };
    },
  ),
);

/**
 * Type InterventionPublicationStoreType
 * @description Injectable publication state instance.
 * @since 1.0.0
 */
export type InterventionPublicationStoreType = InstanceType<typeof InterventionPublicationStore>;
