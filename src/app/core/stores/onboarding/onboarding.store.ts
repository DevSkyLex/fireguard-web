import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { OnboardingService } from '@core/services/api/onboarding';
import type {
  OnboardingOutput,
  OnboardingStepKey,
  OnboardingStepOutput,
  StartOnboardingInput,
} from '@core/models/onboarding';
import type { OnboardingStoreState } from './onboarding-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type OperationError,
  Operation,
} from '../operations';
import { onboardingStoreEvents } from './onboarding.events';

interface ExecuteStepPayload {
  readonly stepKey: OnboardingStepKey;
}

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
  loadOperation: createIdleOperation(),
  startOperation: createIdleOperation(),
  executeStepOperation: createIdleOperation(),
  skipStepOperation: createIdleOperation(),
  rollbackOperation: createIdleOperation(),
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
 * const store = inject(OnboardingStore);
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
    isLoading: computed<boolean>(() => store.loadOperation().status === 'loading'),

    /**
     * Computed isStarting
     *
     * @description
     * Returns `true` while the start-onboarding POST request is in-flight.
     *
     * @returns {boolean}
     */
    isStarting: computed<boolean>(() => store.startOperation().status === 'loading'),

    /**
     * Computed isExecutingStep
     *
     * @description
     * Returns `true` while an execute-step request is in-flight.
     *
     * @returns {boolean}
     */
    isExecutingStep: computed<boolean>(() => store.executeStepOperation().status === 'loading'),

    /**
     * Computed isSkippingStep
     *
     * @description
     * Returns `true` while a skip-step request is in-flight.
     *
     * @returns {boolean}
     */
    isSkippingStep: computed<boolean>(() => store.skipStepOperation().status === 'loading'),

    /**
     * Computed isRollingBack
     *
     * @description
     * Returns `true` while a rollback request is in-flight.
     *
     * @returns {boolean}
     */
    isRollingBack: computed<boolean>(() => store.rollbackOperation().status === 'loading'),

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
      const operations: Operation<OnboardingOutput, unknown>[] = [
        store.loadOperation(),
        store.startOperation(),
        store.executeStepOperation(),
        store.skipStepOperation(),
        store.rollbackOperation(),
      ];
      return operations.some((operation: Operation<OnboardingOutput, unknown>) => operation.status === 'loading');
    }),

    /**
     * Computed loadError
     *
     * @description
     * Returns the load-operation error, or `null` if not in error state.
     *
     * @returns {OperationError<unknown> | null}
     */
    loadError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<OnboardingOutput, unknown> = store.loadOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed executeStepError
     *
     * @description
     * Returns the execute-step error, or `null` if not in error state.
     *
     * @returns {OperationError<unknown> | null}
     */
    executeStepError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<OnboardingOutput, unknown> = store.executeStepOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

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
    completedSteps: computed<readonly OnboardingStepKey[]>(() => store.onboarding()?.completedSteps ?? []),

    /** Whether a rollback action is available. */
    canRollback: computed<boolean>(() => store.onboarding()?.canRollback ?? false),

    /** Reason the workflow is blocked, or `null`. */
    blockedReason: computed<string | null>(() => store.onboarding()?.blockedReason ?? null),

    /** Organization ID associated with the onboarding, or `null`. */
    targetOrganizationId: computed<string | null>(() => store.onboarding()?.targetOrganizationId ?? null),

    /** Organization name associated with the onboarding, or `null`. */
    targetOrganizationName: computed<string | null>(() => store.onboarding()?.targetOrganizationName ?? null),

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
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    onboardingService = inject<OnboardingService>(OnboardingService),
  ) => ({
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
    load: rxMethod<void>(pipe(
      tap(() => patchState(store, { loadOperation: createLoadingOperation(store.loadOperation().data) })),
      switchMap(() => onboardingService.get().pipe(
        tapResponse({
          next: (response: OnboardingOutput) => {
            patchState(store, {
              onboarding: response,
              loadOperation: createSuccessOperation(response),
            });
          },
          error: (error: unknown) => {
            const operationError = createOperationErrorFromUnknown(error);
            patchState(store, { loadOperation: createErrorOperation(operationError, store.loadOperation().data) });
            dispatcher.dispatch(onboardingStoreEvents.loadFailed(toOperationFailureEventPayload(operationError, 'Failed to load onboarding')));
          },
        }),
      )),
    )),

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
    start: rxMethod<StartOnboardingInput>(pipe(
      tap(() => patchState(store, { startOperation: createLoadingOperation(store.startOperation().data) })),
      exhaustMap((input: StartOnboardingInput) => onboardingService.start(input).pipe(
        tapResponse({
          next: (response: OnboardingOutput) => {
            patchState(store, {
              onboarding: response,
              startOperation: createSuccessOperation(response),
            });
          },
          error: (error: unknown) => {
            const operationError = createOperationErrorFromUnknown(error);
            patchState(store, { startOperation: createErrorOperation(operationError, store.startOperation().data) });
            dispatcher.dispatch(onboardingStoreEvents.startFailed(toOperationFailureEventPayload(operationError, 'Failed to start onboarding')));
          },
        }),
      )),
    )),

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
    executeStep: rxMethod<ExecuteStepPayload>(pipe(
      tap(() => patchState(store, { executeStepOperation: createLoadingOperation(store.executeStepOperation().data) })),
      exhaustMap(({ stepKey }: ExecuteStepPayload) => onboardingService.executeStep(stepKey).pipe(
        tapResponse({
          next: (response: OnboardingOutput) => {
            patchState(store, {
              onboarding: response,
              executeStepOperation: createSuccessOperation(response),
            });
          },
          error: (error: unknown) => {
            const operationError = createOperationErrorFromUnknown(error);
            patchState(store, { executeStepOperation: createErrorOperation(operationError, store.executeStepOperation().data) });
            dispatcher.dispatch(onboardingStoreEvents.executeStepFailed(toOperationFailureEventPayload(operationError, 'Failed to execute step')));
          },
        }),
      )),
    )),

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
    skipStep: rxMethod<OnboardingStepKey>(pipe(
      tap(() => patchState(store, { skipStepOperation: createLoadingOperation(store.skipStepOperation().data) })),
      exhaustMap((stepKey) => onboardingService.skipStep(stepKey).pipe(
        tapResponse({
          next: (response: OnboardingOutput) => {
            patchState(store, {
              onboarding: response,
              skipStepOperation: createSuccessOperation(response),
            });
          },
          error: (error: unknown) => {
            const operationError = createOperationErrorFromUnknown(error);
            patchState(store, { skipStepOperation: createErrorOperation(operationError, store.skipStepOperation().data) });
            dispatcher.dispatch(onboardingStoreEvents.skipStepFailed(toOperationFailureEventPayload(operationError, 'Failed to skip step')));
          },
        }),
      )),
    )),

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
    rollback: rxMethod<void>(pipe(
      tap(() => patchState(store, { rollbackOperation: createLoadingOperation(store.rollbackOperation().data) })),
      exhaustMap(() => onboardingService.rollback().pipe(
        tapResponse({
          next: (response: OnboardingOutput) => {
            patchState(store, {
              onboarding: response,
              rollbackOperation: createSuccessOperation(response),
            });
          },
          error: (error: unknown) => {
            const operationError = createOperationErrorFromUnknown(error);
            patchState(store, { rollbackOperation: createErrorOperation(operationError, store.rollbackOperation().data) });
            dispatcher.dispatch(onboardingStoreEvents.rollbackFailed(toOperationFailureEventPayload(operationError, 'Failed to rollback step')));
          },
        }),
      )),
    )),

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
      patchState(store, { executeStepOperation: createIdleOperation() });
    },
  })),
  //#endregion
);

export type OnboardingStore = InstanceType<typeof OnboardingStore>;
