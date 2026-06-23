import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  Observable,
  catchError,
  exhaustMap,
  firstValueFrom,
  map,
  of,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { OnboardingService } from '@features/onboarding/data-access';
import type {
  OnboardingOutput,
  OnboardingStepKey,
  OnboardingStepOutput,
  StartOnboardingInput,
} from '@features/onboarding/models';
import { onboardingStoreEvents } from './events';
import type { OnboardingStoreState } from './models';

interface ExecuteStepPayload {
  readonly stepKey: OnboardingStepKey;
}

const isBlockingState = (state: string): boolean => state === 'in_progress' || state === 'blocked';

const ONBOARDING_TRANSFER_KEY = makeStateKey<OnboardingOutput | null>('organization-onboarding');

//#region Initial State
/**
 * Constant INITIAL_ONBOARDING_STATE
 * @const INITIAL_ONBOARDING_STATE
 *
 * @description
 * Initial state for the OnboardingStore. Every operation starts idle
 * and the onboarding record is `null` until fetched.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ONBOARDING_STATE: OnboardingStoreState = {
  onboarding: null,
  loadCallState: idleCallState(),
  startCallState: idleCallState(),
  executeStepCallState: idleCallState(),
  skipStepCallState: idleCallState(),
  rollbackCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store OnboardingStore
 * @const OnboardingStore
 *
 * @description
 * Root-level NgRx SignalStore for the onboarding workflow. Manages a single
 * `OnboardingOutput` record and exposes methods for every lifecycle action
 * (load, start, execute-step, skip-step, rollback). Provided at root because
 * the onboarding state is consulted across multiple pages and guards.
 *
 * Each API action has a dedicated `Operation` so the UI can independently
 * show loading/error states per action (e.g. spinner on a single step button).
 *
 * @example
 * ```typescript
 * const store = inject<OnboardingStore>(OnboardingStore);
 *
 * // Load the onboarding record
 * store.load();
 *
 * // Execute a step
 * store.executeStep({ stepKey: 'create_organization' });
 *
 * // Check progress
 * if (store.isCompleted()) { … }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OnboardingStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<OnboardingStoreState>(INITIAL_ONBOARDING_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isLoading
     *
     * @description
     * Returns `true` while the onboarding GET request is in-flight.
     *
     * @returns {boolean}
     */
    isLoading: computed<boolean>(() => store.loadCallState().status === 'pending'),

    /**
     * Computed isStarting
     *
     * @description
     * Returns `true` while the start-onboarding POST request is in-flight.
     *
     * @returns {boolean}
     */
    isStarting: computed<boolean>(() => store.startCallState().status === 'pending'),

    /**
     * Computed isExecutingStep
     *
     * @description
     * Returns `true` while an execute-step request is in-flight.
     *
     * @returns {boolean}
     */
    isExecutingStep: computed<boolean>(() => store.executeStepCallState().status === 'pending'),

    /**
     * Computed isSkippingStep
     *
     * @description
     * Returns `true` while a skip-step request is in-flight.
     *
     * @returns {boolean}
     */
    isSkippingStep: computed<boolean>(() => store.skipStepCallState().status === 'pending'),

    /**
     * Computed isRollingBack
     *
     * @description
     * Returns `true` while a rollback request is in-flight.
     *
     * @returns {boolean}
     */
    isRollingBack: computed<boolean>(() => store.rollbackCallState().status === 'pending'),

    /**
     * Computed isBusy
     *
     * @description
     * Returns `true` when **any** onboarding operation is in-flight.
     * Used to disable UI controls globally during mutations.
     *
     * @returns {boolean}
     */
    isBusy: computed<boolean>(() => {
      const callStates: CallState<OnboardingOutput>[] = [
        store.loadCallState(),
        store.startCallState(),
        store.executeStepCallState(),
        store.skipStepCallState(),
        store.rollbackCallState(),
      ];
      return callStates.some((cs) => cs.status === 'pending');
    }),

    /**
     * Computed loadError
     *
     * @description
     * Returns the load call state error, or `null` if not in error state.
     *
     * @returns {StoreError | null}
     */
    loadError: computed<StoreError | null>(() => store.loadCallState().error),

    /**
     * Computed executeStepError
     *
     * @description
     * Returns the execute-step error, or `null` if not in error state.
     *
     * @returns {StoreError | null}
     */
    executeStepError: computed<StoreError | null>(() => store.executeStepCallState().error),

    /** Current onboarding state string, or `null` if not loaded. */
    state: computed(() => store.onboarding()?.state ?? null),

    /** `true` when the onboarding workflow is fully completed. */
    isCompleted: computed<boolean>(() => store.onboarding()?.state === 'completed'),

    /** `true` when the onboarding workflow is blocked. */
    isBlocked: computed<boolean>(() => store.onboarding()?.state === 'blocked'),

    /** `true` when the onboarding workflow is in progress. */
    isInProgress: computed<boolean>(() => store.onboarding()?.state === 'in_progress'),

    /** Key of the next step to execute, or `null` if completed. */
    nextStep: computed<OnboardingStepKey | null>(() => store.onboarding()?.nextStep ?? null),

    /** Ordered list of all onboarding steps. */
    steps: computed<readonly OnboardingStepOutput[]>(() => store.onboarding()?.steps ?? []),

    /** Keys of already-completed steps. */
    completedSteps: computed<readonly OnboardingStepKey[]>(
      () => store.onboarding()?.completedSteps ?? [],
    ),

    /** Whether a rollback action is available. */
    canRollback: computed<boolean>(() => store.onboarding()?.canRollback ?? false),

    /** Reason the workflow is blocked, or `null`. */
    blockedReason: computed<string | null>(() => store.onboarding()?.blockedReason ?? null),

    /** Organization ID associated with the onboarding, or `null`. */
    targetOrganizationId: computed<string | null>(
      () => store.onboarding()?.targetOrganizationId ?? null,
    ),

    /** Organization name associated with the onboarding, or `null`. */
    targetOrganizationName: computed<string | null>(
      () => store.onboarding()?.targetOrganizationName ?? null,
    ),

    /**
     * Computed activeStepIndex
     *
     * @description
     * Zero-based index of the current (next-to-execute) step in the
     * `steps` array. Returns `steps.length` when all steps are done.
     *
     * @returns {number}
     */
    activeStepIndex: computed<number>(() => {
      const onboarding: OnboardingOutput | null = store.onboarding();
      if (!onboarding) return 0;

      const nextStep: OnboardingStepKey | null = onboarding.nextStep;
      if (!nextStep) return onboarding.steps.length;

      return onboarding.steps.findIndex((s) => s.key === nextStep);
    }),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      onboardingService = inject<OnboardingService>(OnboardingService),
      platformId = inject<object>(PLATFORM_ID),
      transferState = inject<TransferState>(TransferState),
    ) => ({
      /**
       * Method initialize
       *
       * @description
       * Bootstraps the onboarding workflow during SSR and reuses the
       * transferred state after browser hydration to avoid a duplicate
       * authenticated request.
       *
       * @since 1.1.0
       *
       * @param {StartOnboardingInput} input - Bootstrap options passed to the start endpoint.
       *
       * @returns {Promise<void>} Resolves when initialization is complete.
       */
      async initialize(input: StartOnboardingInput = { reset: false }): Promise<void> {
        if (store.onboarding() !== null) {
          return;
        }

        const callState = store.startCallState();
        if (callState.status === 'pending' || callState.status === 'success') {
          return;
        }

        if (isPlatformBrowser(platformId) && transferState.hasKey(ONBOARDING_TRANSFER_KEY)) {
          const transferred = transferState.get(ONBOARDING_TRANSFER_KEY, null);
          transferState.remove(ONBOARDING_TRANSFER_KEY);

          if (transferred) {
            patchState(store, {
              onboarding: transferred,
              startCallState: successCallState(transferred),
            });
            return;
          }
        }

        patchState(store, { startCallState: pendingCallState() });

        await firstValueFrom(
          onboardingService.start(input).pipe(
            tapResponse({
              next: (response: OnboardingOutput) => {
                patchState(store, {
                  onboarding: response,
                  startCallState: successCallState(response),
                });
                transferState.set(ONBOARDING_TRANSFER_KEY, response);
              },
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { startCallState: errorCallState(storeError) });
                transferState.set(ONBOARDING_TRANSFER_KEY, null);
                dispatcher.dispatch(
                  onboardingStoreEvents.startFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to start onboarding'),
                  ),
                );
              },
            }),
          ),
          { defaultValue: undefined },
        );
      },

      /**
       * Method load
       *
       * @description
       * Fetches the current onboarding record from the API. Uses `switchMap`
       * so a new call cancels any in-flight request.
       *
       * @fires onboardingStoreEvents.loadFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      load: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap(() =>
            onboardingService.get().pipe(
              tapResponse({
                next: (response: OnboardingOutput) => {
                  patchState(store, {
                    onboarding: response,
                    loadCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { loadCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    onboardingStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load onboarding'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method start
       *
       * @description
       * Starts the onboarding workflow by posting the initial input to the
       * API. Uses `exhaustMap` to prevent duplicate submissions.
       *
       * @param {StartOnboardingInput} input  Configuration for the new
       *   onboarding (e.g. target organization).
       *
       * @fires onboardingStoreEvents.startFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      start: rxMethod<StartOnboardingInput>(
        pipe(
          tap(() => patchState(store, { startCallState: pendingCallState() })),
          exhaustMap((input: StartOnboardingInput) =>
            onboardingService.start(input).pipe(
              tapResponse({
                next: (response: OnboardingOutput) => {
                  patchState(store, {
                    onboarding: response,
                    startCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { startCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    onboardingStoreEvents.startFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to start onboarding'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method executeStep
       *
       * @description
       * Executes an onboarding step by key. Uses `exhaustMap` to prevent
       * duplicate submissions. On success the full onboarding record is
       * refreshed.
       *
       * @param {ExecuteStepPayload} payload  Contains the `stepKey` to execute.
       *
       * @fires onboardingStoreEvents.executeStepFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      executeStep: rxMethod<ExecuteStepPayload>(
        pipe(
          tap(() => patchState(store, { executeStepCallState: pendingCallState() })),
          exhaustMap(({ stepKey }: ExecuteStepPayload) =>
            onboardingService.executeStep(stepKey).pipe(
              tapResponse({
                next: (response: OnboardingOutput) => {
                  patchState(store, {
                    onboarding: response,
                    executeStepCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { executeStepCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    onboardingStoreEvents.executeStepFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to execute step'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method skipStep
       *
       * @description
       * Skips an onboarding step by key. Uses `exhaustMap` to prevent
       * duplicate submissions.
       *
       * @param {OnboardingStepKey} stepKey  The step key to skip.
       *
       * @fires onboardingStoreEvents.skipStepFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      skipStep: rxMethod<OnboardingStepKey>(
        pipe(
          tap(() => patchState(store, { skipStepCallState: pendingCallState() })),
          exhaustMap((stepKey) =>
            onboardingService.skipStep(stepKey).pipe(
              tapResponse({
                next: (response: OnboardingOutput) => {
                  patchState(store, {
                    onboarding: response,
                    skipStepCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { skipStepCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    onboardingStoreEvents.skipStepFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to skip step'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method rollback
       *
       * @description
       * Rolls back the last completed onboarding step. Uses `exhaustMap`
       * to prevent duplicate submissions. Check `canRollback()` before
       * calling to ensure a rollback is available.
       *
       * @fires onboardingStoreEvents.rollbackFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      rollback: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { rollbackCallState: pendingCallState() })),
          exhaustMap(() =>
            onboardingService.rollback().pipe(
              tapResponse({
                next: (response: OnboardingOutput) => {
                  patchState(store, {
                    onboarding: response,
                    rollbackCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { rollbackCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    onboardingStoreEvents.rollbackFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to rollback step'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method clear
       *
       * @description
       * Resets the store to its initial state: clears the onboarding
       * record and resets all operations to idle.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      clear(): void {
        patchState(store, INITIAL_ONBOARDING_STATE);
      },

      /**
       * Method resetExecuteStepOperation
       *
       * @description
       * Resets the execute-step operation to idle. Call this after
       * displaying an error to the user so the next step attempt
       * starts fresh.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      resetExecuteStepOperation(): void {
        patchState(store, { executeStepCallState: idleCallState() });
      },

      /**
       * Method checkBlocking
       *
       * @description
       * Returns an `Observable<boolean>` that emits `true` when an onboarding
       * workflow is currently blocking navigation (`in_progress` or `blocked`).
       *
       * If the onboarding record is already present in the store the decision is
       * made synchronously (via `of()`). Otherwise the API is called once and the
       * response is patched into the store as a side-effect so that the onboarding
       * page does not need to re-fetch it.
       *
       * A network / API error is treated as "not blocking" so that a failing
       * onboarding endpoint never hard-locks the application.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      checkBlocking(): Observable<boolean> {
        const current: OnboardingOutput | null = store.onboarding();
        if (current !== null) {
          return of(isBlockingState(current.state));
        }

        return onboardingService.get().pipe(
          tap((response: OnboardingOutput) =>
            patchState(store, {
              onboarding: response,
              loadCallState: successCallState(response),
            }),
          ),
          map((response: OnboardingOutput) => isBlockingState(response.state)),
          catchError((error: unknown): Observable<boolean> => {
            // 404 → aucun workflow d'onboarding pour cet utilisateur → non bloquant
            if (error instanceof HttpErrorResponse && error.status === 404) {
              return of(false);
            }
            // Toute autre erreur (réseau, 5xx) → fail-closed → rediriger vers /onboarding
            return of(true);
          }),
        );
      },
    }),
  ),
  //#endregion
);

export type OnboardingStore = InstanceType<typeof OnboardingStore>;
