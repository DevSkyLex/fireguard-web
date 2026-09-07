import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  catchError,
  concatMap,
  defer,
  exhaustMap,
  filter,
  from,
  map,
  of,
  pipe,
  switchMap,
  tap,
  toArray,
  type Observable,
} from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { OnboardingService } from '@features/onboarding/data-access';
import type {
  OnboardingOutput,
  OnboardingSetupOperation,
  OnboardingSetupPayload,
  OnboardingSetupStep,
} from '@features/onboarding/models';
import { setupPayloadKey } from '@features/onboarding/utils';
import {
  OrganizationSetupService,
  type SetupCreateEquipmentInput,
  type SetupCreateFacilityInput,
  type SetupCreateOrganizationInput,
  type SetupInviteMemberInput,
} from '@features/organization/setup';
import { onboardingSetupEvents } from './events';

/**
 * Type DurableOnboardingOutput
 * @type {DurableOnboardingOutput}
 * @description Recovery response after verifying its server session and journal.
 * @since 1.1.0
 */
type DurableOnboardingOutput = OnboardingOutput & {
  readonly sessionId: string;
  readonly setupOperations: readonly OnboardingSetupOperation[];
};

/**
 * Function requireJournal
 * @description Rejects incomplete or foreign recovery responses before any resource write or progression.
 * @access private
 * @since 1.1.0
 * @param {OnboardingOutput} flow - Server recovery response.
 * @param {string | undefined} sessionId - Expected session for an active batch.
 * @returns {DurableOnboardingOutput} Validated response.
 */
function requireJournal(flow: OnboardingOutput, sessionId?: string): DurableOnboardingOutput {
  if (
    !flow.sessionId ||
    !Array.isArray(flow.setupOperations) ||
    (sessionId && flow.sessionId !== sessionId) ||
    flow.setupOperations.some(
      (operation) =>
        !operation.itemKey ||
        !operation.payload ||
        !['prepared', 'completed'].includes(operation.status) ||
        (operation.status === 'completed' && !operation.resourceId),
    )
  ) {
    throw new Error(
      $localize`:@@onboarding.setup.unavailable:Your setup could not be restored. Please refresh and try again.`,
    );
  }
  return flow as DurableOnboardingOutput;
}

/**
 * Interface OnboardingSetupState
 * @interface OnboardingSetupState
 * @description Browser-only journal snapshot and independent loading/creation request states.
 * @since 1.1.0
 */
interface OnboardingSetupState {
  readonly flow: DurableOnboardingOutput | null;
  readonly failedItemKeys: readonly string[];
  readonly loadCallState: CallState<void>;
  readonly batchCallState: CallState<void>;
}

/**
 * Store OnboardingSetupStore
 * @const OnboardingSetupStore
 * @description Page-scoped durable setup. A complete batch is prepared before writes; retries replay stable receipts and completed items never consume quota again. No draft payload enters TransferState.
 * @since 1.1.0
 */
export const OnboardingSetupStore = signalStore(
  withState<OnboardingSetupState>({
    flow: null,
    failedItemKeys: [],
    loadCallState: idleCallState(),
    batchCallState: idleCallState(),
  }),
  withComputed((store) => ({
    /**
     * Property operations
     * @readonly
     * @description Durable prepared and completed entries.
     * @access public
     * @since 1.1.0
     * @type {Signal<readonly OnboardingSetupOperation[]>}
     */
    operations: computed(() => store.flow()?.setupOperations ?? []),
    /**
     * Property pending
     * @readonly
     * @description Blocks competing creation and refresh commands.
     * @access public
     * @since 1.1.0
     * @type {Signal<boolean>}
     */
    pending: computed(
      () =>
        store.loadCallState().status === 'pending' || store.batchCallState().status === 'pending',
    ),
    /**
     * Property ready
     * @readonly
     * @description Requires a server session and an explicit journal snapshot.
     * @access public
     * @since 1.1.0
     * @type {Signal<boolean>}
     */
    ready: computed(
      () =>
        store.loadCallState().status === 'success' &&
        !!store.flow()?.sessionId &&
        store.flow()?.setupOperations !== undefined,
    ),
  })),
  withMethods(
    (
      store,
      service = inject(OnboardingService),
      setup = inject(OrganizationSetupService),
      dispatcher = inject(Dispatcher),
      platformId = inject<object>(PLATFORM_ID),
    ) => {
      /**
       * Function fail
       * @description Retains the journal and reports a failed request through the shared feedback event contract.
       * @access private
       * @since 1.1.0
       * @param {StoreError} failure - Already normalized transport or recovery failure.
       * @returns {StoreError} Normalized failure.
       */
      function fail(failure: StoreError): StoreError {
        dispatcher.dispatch(
          onboardingSetupEvents.failed(
            toStoreFailureEventPayload(
              failure,
              $localize`:@@onboarding.setup.failed:Setup could not be saved. Your prepared items are available to retry.`,
            ),
          ),
        );
        return failure;
      }

      /**
       * Function execute
       * @description Replays one prepared receipt through the owning resource service, never through an alternate creation endpoint.
       * @access private
       * @since 1.1.0
       * @param {OnboardingSetupOperation} operation - Durable item to create.
       * @param {OnboardingOutput} flow - Its current server scope.
       * @returns {Observable<unknown>} Owner endpoint response.
       */
      function execute(
        operation: OnboardingSetupOperation,
        flow: DurableOnboardingOutput,
      ): Observable<unknown> {
        const context = {
          onboardingSessionId: flow.sessionId,
          onboardingItemKey: operation.itemKey,
        };
        if (operation.stepKey === 'create_organization')
          return setup.createOrganization(
            operation.payload as SetupCreateOrganizationInput,
            context,
          );
        const organizationId = flow.targetOrganizationId;
        if (!organizationId)
          throw new Error(
            $localize`:@@onboarding.setup.organizationUnavailable:Your organization could not be restored. Please refresh and try again.`,
          );
        switch (operation.stepKey) {
          case 'invite_members':
            return setup.inviteMembers(
              organizationId,
              [operation.payload as SetupInviteMemberInput],
              context,
            );
          case 'create_first_facility':
            return setup.createFacilities(
              organizationId,
              [operation.payload as SetupCreateFacilityInput],
              context,
            );
          case 'create_first_equipment': {
            const { facility, ...payload } = operation.payload as Omit<
              SetupCreateEquipmentInput,
              'facilityId'
            > & { facility?: string | null };
            return setup.createEquipment(
              organizationId,
              { ...payload, facilityId: facility?.split('/').pop() },
              context,
            );
          }
        }
      }

      return {
        /**
         * Method load
         * @method load
         * @description Reuses a browser route result or fetches the secondary journal omitted from the SSR handoff. A reload never creates a session implicitly.
         * @access public
         * @since 1.1.0
         * @param {OnboardingOutput | null} snapshot - Existing full route response, or null for manual refresh.
         * @returns {void}
         */
        load: rxMethod<OnboardingOutput | null>(
          pipe(
            filter(
              () => isPlatformBrowser(platformId) && store.batchCallState().status !== 'pending',
            ),
            switchMap((snapshot) => {
              patchState(store, { loadCallState: pendingCallState() });
              return (
                snapshot?.sessionId && snapshot.setupOperations !== undefined
                  ? of(snapshot)
                  : service.get()
              ).pipe(
                map((flow) => requireJournal(flow)),
                tapResponse({
                  next: (flow) => {
                    const changedSession = flow.sessionId !== store.flow()?.sessionId;
                    patchState(store, {
                      flow,
                      loadCallState: successCallState(undefined),
                      ...(changedSession
                        ? { failedItemKeys: [], batchCallState: idleCallState() }
                        : {}),
                    });
                  },
                  error: (error: unknown) =>
                    patchState(store, { loadCallState: errorCallState(fail(toStoreError(error))) }),
                }),
              );
            }),
          ),
        ),

        /**
         * Method run
         * @method run
         * @description Persists all pending inputs, creates remaining items sequentially, then refreshes the journal before progression. Lost creation responses retain their original item keys for a safe replay.
         * @access public
         * @since 1.1.0
         * @param {{stepKey: OnboardingSetupStep; payloads: readonly OnboardingSetupPayload[]}} batch - Complete current form batch.
         * @returns {void}
         */
        run: rxMethod<{
          stepKey: OnboardingSetupStep;
          payloads: readonly OnboardingSetupPayload[];
        }>(
          pipe(
            filter(() => isPlatformBrowser(platformId) && store.ready() && !store.pending()),
            exhaustMap(({ stepKey, payloads }) =>
              defer(() => {
                const currentFlow = store.flow();
                if (!currentFlow) return EMPTY;
                const sessionId = currentFlow.sessionId;
                const used = new Set<string>();
                const items = payloads.map((payload) => {
                  const prior = store
                    .operations()
                    .find(
                      (entry) =>
                        entry.stepKey === stepKey &&
                        !used.has(entry.itemKey) &&
                        setupPayloadKey(entry.payload) === setupPayloadKey(payload),
                    );
                  const itemKey = prior?.itemKey ?? crypto.randomUUID();
                  used.add(itemKey);
                  return { itemKey, payload };
                });
                patchState(store, { batchCallState: pendingCallState(), failedItemKeys: [] });
                return service.prepareSetup({ sessionId, stepKey, items }).pipe(
                  map((response) => {
                    const flow = requireJournal(response, sessionId);
                    if (
                      items.some(
                        (item) =>
                          !flow.setupOperations.some(
                            (operation) =>
                              operation.stepKey === stepKey &&
                              operation.itemKey === item.itemKey &&
                              setupPayloadKey(operation.payload) === setupPayloadKey(item.payload),
                          ),
                      )
                    ) {
                      throw new Error(
                        $localize`:@@onboarding.setup.unavailable:Your setup could not be restored. Please refresh and try again.`,
                      );
                    }
                    return flow;
                  }),
                  tap((flow) => {
                    patchState(store, { flow });
                    dispatcher.dispatch(onboardingSetupEvents.snapshotUpdated(flow));
                  }),
                  concatMap((flow) => {
                    const pending = (flow.setupOperations ?? []).filter(
                      (entry) =>
                        entry.stepKey === stepKey &&
                        entry.status === 'prepared' &&
                        items.some((item) => item.itemKey === entry.itemKey),
                    );
                    return from(pending).pipe(
                      concatMap((operation) =>
                        defer(() => execute(operation, flow)).pipe(
                          map((): StoreError | null => null),
                          catchError((error: unknown) => {
                            patchState(store, {
                              failedItemKeys: [...store.failedItemKeys(), operation.itemKey],
                            });
                            return of(toStoreError(error));
                          }),
                        ),
                      ),
                      toArray(),
                    );
                  }),
                  concatMap((errors) =>
                    service.get().pipe(
                      map((response) => {
                        const flow = requireJournal(response, sessionId);
                        const incomplete = items.filter(
                          (item) =>
                            !flow.setupOperations.some(
                              (operation) =>
                                operation.stepKey === stepKey &&
                                operation.itemKey === item.itemKey &&
                                operation.status === 'completed',
                            ),
                        );
                        patchState(store, {
                          failedItemKeys: incomplete.map((item) => item.itemKey),
                        });
                        return {
                          flow,
                          failure: incomplete.length
                            ? (errors.find((error) => error !== null) ??
                              toStoreError(
                                new Error(
                                  $localize`:@@onboarding.setup.incomplete:Some items are still pending. Please try again to finish your setup.`,
                                ),
                              ))
                            : null,
                        };
                      }),
                    ),
                  ),
                  tapResponse({
                    next: ({ flow, failure }) => {
                      patchState(store, {
                        flow,
                        batchCallState: failure
                          ? errorCallState(failure)
                          : successCallState(undefined),
                      });
                      dispatcher.dispatch(onboardingSetupEvents.snapshotUpdated(flow));
                      if (failure) {
                        fail(failure);
                        return;
                      }
                      dispatcher.dispatch(onboardingSetupEvents.completed({ stepKey }));
                    },
                    error: (error: unknown) =>
                      patchState(store, {
                        batchCallState: errorCallState(fail(toStoreError(error))),
                      }),
                  }),
                );
              }).pipe(
                catchError((error: unknown) => {
                  patchState(store, { batchCallState: errorCallState(fail(toStoreError(error))) });
                  return EMPTY;
                }),
              ),
            ),
          ),
        ),
      };
    },
  ),
);

/**
 * Type OnboardingSetupStoreType
 * @type {OnboardingSetupStoreType}
 * @description Injectable setup store instance.
 * @since 1.1.0
 */
export type OnboardingSetupStoreType = InstanceType<typeof OnboardingSetupStore>;
