import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { from, pipe, switchMap, tap } from 'rxjs';
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
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import { interventionPublicationStoreEvents } from './events';
import type { InterventionPublicationState } from './models';

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
       * @access public
       * @since 1.0.0
       *
       * @param {InterventionOutput} intervention - The intervention to publish.
       *
       * @returns {void} No return value — progress is observable through `publishing`/`error`.
       */
      publish: rxMethod<InterventionOutput>(
        pipe(
          tap(() => patchState(store, { publishCallState: pendingCallState() })),
          switchMap((intervention) =>
            from(publication.publish(intervention)).pipe(
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
                    patchState(store, { publishCallState: errorCallState(failure) });

                    return;
                  }

                  patchState(store, { publishCallState: successCallState(result) });
                  dispatcher.dispatch(interventionPublicationStoreEvents.publishSucceeded(result));
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = {
                    ...toStoreError(error),
                    message: $localize`:@@intervention.publication.requestFailed:The publication request could not be completed.`,
                  };
                  patchState(store, { publishCallState: errorCallState(storeError) });
                },
              }),
            ),
          ),
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
