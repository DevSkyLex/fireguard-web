import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, from, merge, pipe, switchMap, tap, timer } from 'rxjs';
import { catchError, ignoreElements, takeUntil } from 'rxjs/operators';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/request-state';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';
import {
  InterventionPublicationService,
  PublicationPollTimeoutError,
} from '@features/organization/features/interventions/services/intervention-publication';
import { interventionPublicationStoreEvents } from './events';
import type { InterventionPublicationState } from './models';

/**
 * Constant LONG_RUNNING_THRESHOLD_MS
 * @const LONG_RUNNING_THRESHOLD_MS
 *
 * @description
 * How long a publish attempt stays pending before the confirmation swaps to
 * its "still working" copy — long enough that a normal publish never shows
 * it, short enough that an operator staring at the dialog gets reassurance
 * well before the poll's own ~2 minute bound.
 *
 * @since 1.1.0
 *
 * @type {number}
 */
const LONG_RUNNING_THRESHOLD_MS = 30_000;

//#region Initial State
/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Idle publish call state — no request has been issued yet.
 *
 * @since 1.0.0
 *
 * @type {InterventionPublicationState}
 */
const INITIAL_STATE: InterventionPublicationState = {
  publishCallState: idleCallState(),
  publicationId: null,
  longRunning: false,
  timedOut: false,
};
//#endregion

/**
 * Store InterventionPublicationStore
 * @const InterventionPublicationStore
 *
 * @description
 * Component-scoped NgRx SignalStore wrapping `InterventionPublicationService`:
 * one named `publishCallState` covers the whole request-and-poll round trip
 * the service already owns, so this store adds no timing of its own — it only
 * reports the service's promise as a `CallState`. A terminal `failed`
 * publication result (not a rejected request) is surfaced the same way as a
 * request failure, since both mean "nothing further proceeds until the
 * operator retries" from the confirmation's point of view.
 *
 * Scoped to the intervention detail page's providers, so a fresh attempt
 * starts idle on every visit rather than carrying a stale error across
 * interventions.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionPublicationStore = signalStore(
  withState<InterventionPublicationState>(INITIAL_STATE),

  withComputed((store) => ({
    /**
     * Computed publishing.
     *
     * @description
     * True while the publish request and its poll are in flight.
     */
    publishing: computed<boolean>(() => isCallPending(store.publishCallState())),

    /**
     * Computed error.
     *
     * @description
     * The last publish attempt's normalized failure message, or `null`.
     */
    error: computed<string | null>(() => store.publishCallState().error?.message ?? null),
  })),

  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      publication = inject<InterventionPublicationService>(InterventionPublicationService),
      isBrowser = isPlatformBrowser(inject(PLATFORM_ID)),
    ) => ({
      /**
       * Method publish
       * @method publish
       *
       * @description
       * Submits the intervention for publication and awaits the service's
       * bounded poll to a terminal result. Dispatches `publishSucceeded` only
       * once the publication actually `completed`, so the page can reload the
       * workspace, close the confirmation and toast without owning any of the
       * request/poll mechanics itself.
       *
       * Runs a browser-only side timer alongside the request: past
       * {@link LONG_RUNNING_THRESHOLD_MS} still pending, `longRunning` flips
       * true; the timer is cancelled the moment the request settles either
       * way, so it never fires after the fact. A
       * {@link PublicationPollTimeoutError} is kept apart from every other
       * rejection — it means the server is still working, not that anything
       * failed, so it sets `timedOut` and keeps the publication id `recheck`
       * needs instead of the generic request-failed message.
       *
       * @access public
       * @since 1.0.0
       *
       * @param {InterventionOutput} intervention - The intervention to publish.
       *
       * @returns {void} No return value — progress is observable through `publishing`/`error`/`longRunning`/`timedOut`.
       */
      publish: rxMethod<InterventionOutput>(
        pipe(
          tap(() =>
            patchState(store, {
              publishCallState: pendingCallState(),
              publicationId: null,
              longRunning: false,
              timedOut: false,
            }),
          ),
          switchMap((intervention) => {
            const result$ = from(publication.publish(intervention));
            const longRunning$ = isBrowser
              ? timer(LONG_RUNNING_THRESHOLD_MS).pipe(
                  tap(() => patchState(store, { longRunning: true })),
                  takeUntil(result$.pipe(catchError(() => EMPTY))),
                  ignoreElements(),
                )
              : EMPTY;

            return merge(
              longRunning$,
              result$.pipe(
                tapResponse({
                  next: (result: PublicationOutput): void => {
                    if (result.status === 'failed') {
                      const failure: StoreError = {
                        error: result,
                        message:
                          result.error ??
                          $localize`:@@intervention.publication.failed:Publication failed without applying partial changes.`,
                        code: null,
                        retryable: false,
                        timestamp: Date.now(),
                      };
                      patchState(store, {
                        publishCallState: errorCallState(failure),
                        longRunning: false,
                      });

                      return;
                    }

                    patchState(store, {
                      publishCallState: successCallState(result),
                      longRunning: false,
                    });
                    dispatcher.dispatch(
                      interventionPublicationStoreEvents.publishSucceeded(result),
                    );
                  },
                  error: (error: unknown): void => {
                    if (error instanceof PublicationPollTimeoutError) {
                      const timeout: StoreError = {
                        error,
                        message: $localize`:@@intervention.publish.timedOutMessage:Publication is still running server-side — it will finish in the background.`,
                        code: null,
                        retryable: true,
                        timestamp: Date.now(),
                      };
                      patchState(store, {
                        publishCallState: errorCallState(timeout),
                        publicationId: error.publicationId,
                        longRunning: false,
                        timedOut: true,
                      });

                      return;
                    }

                    const storeError: StoreError = {
                      ...toStoreError(error),
                      message: $localize`:@@intervention.publication.requestFailed:The publication request could not be completed.`,
                    };
                    patchState(store, {
                      publishCallState: errorCallState(storeError),
                      longRunning: false,
                    });
                  },
                }),
              ),
            );
          }),
        ),
      ),

      /**
       * Method recheck
       * @method recheck
       *
       * @description
       * Re-reads the timed-out publication once, for the "Check again" the
       * confirmation offers after {@link publish} rejects with a
       * {@link PublicationPollTimeoutError}. A no-op without a captured
       * `publicationId` — nothing to re-check yet.
       *
       * @access public
       * @since 1.1.0
       *
       * @returns {void} No return value — progress is observable through `publishing`/`error`/`timedOut`.
       */
      recheck: rxMethod<void>(
        pipe(
          switchMap(() => {
            const publicationId: string | null = store.publicationId();
            if (publicationId === null) return EMPTY;

            patchState(store, { publishCallState: pendingCallState() });

            return from(publication.checkStatus(publicationId)).pipe(
              tapResponse({
                next: (result: PublicationOutput): void => {
                  if (result.status === 'completed') {
                    patchState(store, {
                      publishCallState: successCallState(result),
                      timedOut: false,
                    });
                    dispatcher.dispatch(
                      interventionPublicationStoreEvents.publishSucceeded(result),
                    );

                    return;
                  }

                  if (result.status === 'failed') {
                    const failure: StoreError = {
                      error: result,
                      message:
                        result.error ??
                        $localize`:@@intervention.publication.failed:Publication failed without applying partial changes.`,
                      code: null,
                      retryable: false,
                      timestamp: Date.now(),
                    };
                    patchState(store, {
                      publishCallState: errorCallState(failure),
                      timedOut: false,
                    });

                    return;
                  }

                  const stillRunning: StoreError = {
                    error: result,
                    message: $localize`:@@intervention.publish.timedOutMessage:Publication is still running server-side — it will finish in the background.`,
                    code: null,
                    retryable: true,
                    timestamp: Date.now(),
                  };
                  patchState(store, {
                    publishCallState: errorCallState(stillRunning),
                    timedOut: true,
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = {
                    ...toStoreError(error),
                    message: $localize`:@@intervention.publication.requestFailed:The publication request could not be completed.`,
                  };
                  patchState(store, { publishCallState: errorCallState(storeError) });
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method reset
       * @method reset
       *
       * @description
       * Clears a previous attempt's result before a fresh confirmation opens,
       * so a stale failure never lingers into the next attempt.
       *
       * @access public
       * @since 1.0.0
       *
       * @returns {void}
       */
      reset(): void {
        patchState(store, INITIAL_STATE);
      },
    }),
  ),
);

/**
 * Type InterventionPublicationStoreType
 *
 * @description
 * Instance type of the {@link InterventionPublicationStore}.
 */
export type InterventionPublicationStoreType = InstanceType<typeof InterventionPublicationStore>;
