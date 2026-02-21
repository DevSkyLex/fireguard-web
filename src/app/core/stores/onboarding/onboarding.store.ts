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

const INITIAL_ONBOARDING_STATE: OnboardingStoreState = {
  onboarding: null,
  loadOperation: createIdleOperation(),
  startOperation: createIdleOperation(),
  executeStepOperation: createIdleOperation(),
  skipStepOperation: createIdleOperation(),
  rollbackOperation: createIdleOperation(),
} as const;

export const OnboardingStore = signalStore(
  { providedIn: 'root' },

  withState<OnboardingStoreState>(INITIAL_ONBOARDING_STATE),

  withComputed((store) => ({
    isLoading: computed<boolean>(() => store.loadOperation().status === 'loading'),
    isStarting: computed<boolean>(() => store.startOperation().status === 'loading'),
    isExecutingStep: computed<boolean>(() => store.executeStepOperation().status === 'loading'),
    isSkippingStep: computed<boolean>(() => store.skipStepOperation().status === 'loading'),
    isRollingBack: computed<boolean>(() => store.rollbackOperation().status === 'loading'),
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
    loadError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<OnboardingOutput, unknown> = store.loadOperation();
      return operation.status === 'error' ? operation.error : null;
    }),
    executeStepError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<OnboardingOutput, unknown> = store.executeStepOperation();
      return operation.status === 'error' ? operation.error : null;
    }),
    state: computed(() => store.onboarding()?.state ?? null),
    isCompleted: computed<boolean>(() => store.onboarding()?.state === 'completed'),
    isBlocked: computed<boolean>(() => store.onboarding()?.state === 'blocked'),
    isInProgress: computed<boolean>(() => store.onboarding()?.state === 'in_progress'),
    nextStep: computed<OnboardingStepKey | null>(() => store.onboarding()?.nextStep ?? null),
    steps: computed<readonly OnboardingStepOutput[]>(() => store.onboarding()?.steps ?? []),
    completedSteps: computed<readonly OnboardingStepKey[]>(() => store.onboarding()?.completedSteps ?? []),
    canRollback: computed<boolean>(() => store.onboarding()?.canRollback ?? false),
    blockedReason: computed<string | null>(() => store.onboarding()?.blockedReason ?? null),
    targetOrganizationId: computed<string | null>(() => store.onboarding()?.targetOrganizationId ?? null),
    targetOrganizationName: computed<string | null>(() => store.onboarding()?.targetOrganizationName ?? null),
    activeStepIndex: computed<number>(() => {
      const onboarding: OnboardingOutput | null = store.onboarding();
      if (!onboarding) return 0;

      const nextStep: OnboardingStepKey | null = onboarding.nextStep;
      if (!nextStep) return onboarding.steps.length;

      return onboarding.steps.findIndex((s) => s.key === nextStep);
    }),
  })),

  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    onboardingService = inject<OnboardingService>(OnboardingService),
  ) => ({
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

    clear(): void {
      patchState(store, INITIAL_ONBOARDING_STATE);
    },

    resetExecuteStepOperation(): void {
      patchState(store, { executeStepOperation: createIdleOperation() });
    },
  })),
);

export type OnboardingStore = InstanceType<typeof OnboardingStore>;
