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
import {
  EMPTY,
  catchError,
  exhaustMap,
  firstValueFrom,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { OrganizationService } from '@core/services/api/organization';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createOperationErrorFromUnknown,
  createSuccessOperation,
  toOperationFailureEventPayload,
  type Operation,
  type OperationError,
} from '@core/stores/operations';
import type {
  FacilityTypeOption,
  FacilityOutput,
  CreateFirstFacilityOnboardingInput,
  CreateOnboardingOrganizationInput,
  OrganizationLegalProfileOutput,
  OrganizationLegalTypeOption,
  OrganizationOnboardingStatusOutput,
  OrganizationOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';
import type { OrganizationState } from './organization-state.interface';
import { organizationStoreEvents } from './organization.events';

/**
 * Constant ONBOARDING_BASE_PATH
 *
 * @description
 * Base route for onboarding pages.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const ONBOARDING_BASE_PATH: string = '/onboarding';

/**
 * Constant INITIAL_ORGANIZATION_STATE
 *
 * @description
 * Initial state for organization store.
 *
 * @since 1.0.0
 *
 * @type {OrganizationState}
 */
const INITIAL_ORGANIZATION_STATE: OrganizationState = {
  organizationLegalTypeOptions: [],
  organizationLegalTypeOptionsLoadOperation: createIdleOperation(),
  facilityTypeOptions: [],
  facilityTypeOptionsLoadOperation: createIdleOperation(),
  onboardingStatus: null,
  onboardingStatusLoadOperation: createIdleOperation(),
  onboardingOrganizationCreateOperation: createIdleOperation(),
  onboardingLegalProfileUpsertOperation: createIdleOperation(),
  onboardingFirstFacilityCreateOperation: createIdleOperation(),
} as const;

/**
 * Function getRouteFromStatus
 *
 * @description
 * Maps backend onboarding status to target frontend route.
 *
 * @since 1.0.0
 *
 * @param {OrganizationOnboardingStatusOutput | null} status - Current onboarding status.
 * @param {string} [completedRoute='/'] - Route to use when onboarding is completed.
 *
 * @returns {string} Target route.
 */
function getRouteFromStatus(
  status: OrganizationOnboardingStatusOutput | null,
  completedRoute: string = '/',
): string {
  if (!status) return ONBOARDING_BASE_PATH;

  if (status.state === 'completed') return completedRoute;
  return ONBOARDING_BASE_PATH;
}

/**
 * Store OrganizationStore
 * @const OrganizationStore
 *
 * @description
 * NGRX SignalStore for organization domain state.
 *
 * @version 1.0.0
 */
export const OrganizationStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<OrganizationState>(INITIAL_ORGANIZATION_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isOrganizationLegalTypeOptionsLoading
     *
     * @description
     * Returns true when legal type options request is in progress.
     *
     * @returns {boolean}
     */
    isOrganizationLegalTypeOptionsLoading: computed<boolean>(
      () => store.organizationLegalTypeOptionsLoadOperation().status === 'loading',
    ),

    /**
     * Computed isFacilityTypeOptionsLoading
     *
     * @description
     * Returns true when facility type options request is in progress.
     *
     * @returns {boolean}
     */
    isFacilityTypeOptionsLoading: computed<boolean>(
      () => store.facilityTypeOptionsLoadOperation().status === 'loading',
    ),

    /**
     * Computed isOnboardingStatusLoading
     *
     * @description
     * Returns true when onboarding status request is in progress.
     *
     * @returns {boolean}
     */
    isOnboardingStatusLoading: computed<boolean>(
      () => store.onboardingStatusLoadOperation().status === 'loading',
    ),

    /**
     * Computed isOnboardingOrganizationCreating
     *
     * @description
     * Returns true when organization creation request is in progress.
     *
     * @returns {boolean}
     */
    isOnboardingOrganizationCreating: computed<boolean>(
      () => store.onboardingOrganizationCreateOperation().status === 'loading',
    ),

    /**
     * Computed isOnboardingLegalProfileUpserting
     *
     * @description
     * Returns true when legal profile upsert request is in progress.
     *
     * @returns {boolean}
     */
    isOnboardingLegalProfileUpserting: computed<boolean>(
      () => store.onboardingLegalProfileUpsertOperation().status === 'loading',
    ),

    /**
     * Computed isOnboardingFirstFacilityCreating
     *
     * @description
     * Returns true when first facility creation request is in progress.
     *
     * @returns {boolean}
     */
    isOnboardingFirstFacilityCreating: computed<boolean>(
      () => store.onboardingFirstFacilityCreateOperation().status === 'loading',
    ),

    /**
     * Computed isOnboardingSubmitting
     *
     * @description
     * Returns true when any onboarding submit operation is running.
     *
     * @returns {boolean}
     */
    isOnboardingSubmitting: computed<boolean>(
      () =>
        store.onboardingOrganizationCreateOperation().status === 'loading' ||
        store.onboardingLegalProfileUpsertOperation().status === 'loading' ||
        store.onboardingFirstFacilityCreateOperation().status === 'loading',
    ),

    /**
     * Computed nextOnboardingRoute
     *
     * @description
     * Returns route matching current status.
     *
     * @returns {string}
     */
    nextOnboardingRoute: computed<string>(() =>
      getRouteFromStatus(store.onboardingStatus()),
    ),

    /**
     * Computed onboardingStatusLoadError
     *
     * @description
     * Returns load status operation error, if any.
     *
     * @returns {OperationError<unknown> | null}
     */
    onboardingStatusLoadError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<OrganizationOnboardingStatusOutput, unknown> =
        store.onboardingStatusLoadOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed organizationLegalTypeOptionsLoadError
     *
     * @description
     * Returns legal type options load operation error, if any.
     *
     * @returns {OperationError<unknown> | null}
     */
    organizationLegalTypeOptionsLoadError: computed<OperationError<unknown> | null>(
      () => {
        const operation: Operation<
          readonly OrganizationLegalTypeOption[],
          unknown
        > = store.organizationLegalTypeOptionsLoadOperation();
        return operation.status === 'error' ? operation.error : null;
      },
    ),

    /**
     * Computed facilityTypeOptionsLoadError
     *
     * @description
     * Returns facility type options load operation error, if any.
     *
     * @returns {OperationError<unknown> | null}
     */
    facilityTypeOptionsLoadError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<readonly FacilityTypeOption[], unknown> =
        store.facilityTypeOptionsLoadOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed onboardingOrganizationCreateError
     *
     * @description
     * Returns organization creation operation error, if any.
     *
     * @returns {OperationError<unknown> | null}
     */
    onboardingOrganizationCreateError: computed<OperationError<unknown> | null>(
      () => {
        const operation: Operation<
          OrganizationOutput,
          unknown,
          CreateOnboardingOrganizationInput
        > =
          store.onboardingOrganizationCreateOperation();
        return operation.status === 'error' ? operation.error : null;
      },
    ),

    /**
     * Computed onboardingLegalProfileUpsertError
     *
     * @description
     * Returns legal profile upsert operation error, if any.
     *
     * @returns {OperationError<unknown> | null}
     */
    onboardingLegalProfileUpsertError: computed<OperationError<unknown> | null>(
      () => {
        const operation: Operation<
          OrganizationLegalProfileOutput,
          unknown,
          { organizationId: string; payload: UpsertOrganizationLegalProfileInput }
        > =
          store.onboardingLegalProfileUpsertOperation();
        return operation.status === 'error' ? operation.error : null;
      },
    ),

    /**
     * Computed onboardingFirstFacilityCreateError
     *
     * @description
     * Returns first facility creation operation error, if any.
     *
     * @returns {OperationError<unknown> | null}
     */
    onboardingFirstFacilityCreateError: computed<OperationError<unknown> | null>(
      () => {
        const operation: Operation<
          FacilityOutput,
          unknown,
          { organizationId: string; payload: CreateFirstFacilityOnboardingInput }
        > =
          store.onboardingFirstFacilityCreateOperation();
        return operation.status === 'error' ? operation.error : null;
      },
    ),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    organizationService = inject<OrganizationService>(OrganizationService),
  ) => ({
    //#region Reactive Methods
    /**
     * Method loadOrganizationLegalTypeOptions
     *
     * @description
     * Loads legal type reference options.
     *
     * @param {void} _ - No input.
     */
    loadOrganizationLegalTypeOptions: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, {
            organizationLegalTypeOptionsLoadOperation: createLoadingOperation(
              store.organizationLegalTypeOptionsLoadOperation().data,
            ),
          });
        }),
        switchMap(() =>
          organizationService.listOrganizationLegalTypes().pipe(
            tapResponse({
              next: (options: readonly OrganizationLegalTypeOption[]) => {
                patchState(store, {
                  organizationLegalTypeOptions: options,
                  organizationLegalTypeOptionsLoadOperation:
                    createSuccessOperation(options),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  organizationLegalTypeOptionsLoadOperation: createErrorOperation(
                    operationError,
                    store.organizationLegalTypeOptionsLoadOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.organizationLegalTypeOptionsLoadFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load legal type options',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method loadFacilityTypeOptions
     *
     * @description
     * Loads facility type reference options.
     *
     * @param {void} _ - No input.
     */
    loadFacilityTypeOptions: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, {
            facilityTypeOptionsLoadOperation: createLoadingOperation(
              store.facilityTypeOptionsLoadOperation().data,
            ),
          });
        }),
        switchMap(() =>
          organizationService.listFacilityTypes().pipe(
            tapResponse({
              next: (options: readonly FacilityTypeOption[]) => {
                patchState(store, {
                  facilityTypeOptions: options,
                  facilityTypeOptionsLoadOperation: createSuccessOperation(options),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  facilityTypeOptionsLoadOperation: createErrorOperation(
                    operationError,
                    store.facilityTypeOptionsLoadOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.facilityTypeOptionsLoadFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load facility type options',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method loadOnboardingStatus
     *
     * @description
     * Loads onboarding status from backend.
     *
     * @param {void} _ - No input.
     */
    loadOnboardingStatus: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, {
            onboardingStatusLoadOperation: createLoadingOperation(
              store.onboardingStatusLoadOperation().data,
            ),
          });
        }),
        switchMap(() =>
          organizationService.getOnboardingStatus().pipe(
            tapResponse({
              next: (response: OrganizationOnboardingStatusOutput) => {
                patchState(store, {
                  onboardingStatus: response,
                  onboardingStatusLoadOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  onboardingStatusLoadOperation: createErrorOperation(
                    operationError,
                    store.onboardingStatusLoadOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.onboardingStatusLoadFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load onboarding status',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method submitOnboardingOrganization
     *
     * @description
     * Creates onboarding organization then refreshes onboarding status.
     *
     * @param {CreateOnboardingOrganizationInput} input - Organization payload.
     */
    submitOnboardingOrganization: rxMethod<CreateOnboardingOrganizationInput>(
      pipe(
        tap((params) => {
          patchState(store, {
            onboardingOrganizationCreateOperation: createLoadingOperation(
              store.onboardingOrganizationCreateOperation().data,
              { params },
            ),
          });
        }),
        exhaustMap((input) =>
          organizationService.createOnboardingOrganization(input).pipe(
            tap((response) => {
              patchState(store, {
                onboardingOrganizationCreateOperation: createSuccessOperation(
                  response,
                  { params: input },
                ),
              });
            }),
            switchMap(() =>
              organizationService.getOnboardingStatus().pipe(
                tapResponse({
                  next: (status: OrganizationOnboardingStatusOutput) => {
                    patchState(store, {
                      onboardingStatus: status,
                      onboardingStatusLoadOperation: createSuccessOperation(status),
                    });
                  },
                  error: (error: unknown) => {
                    const operationError: OperationError<unknown> =
                      createOperationErrorFromUnknown(error);
                    patchState(store, {
                      onboardingStatusLoadOperation: createErrorOperation(
                        operationError,
                        store.onboardingStatusLoadOperation().data,
                      ),
                    });
                    dispatcher.dispatch(
                      organizationStoreEvents.onboardingStatusLoadFailed(
                        toOperationFailureEventPayload(
                          operationError,
                          'Failed to refresh onboarding status',
                        ),
                      ),
                    );
                  },
                }),
                // Keep creation operation success even if status refresh fails.
                catchError(() => EMPTY),
              ),
            ),
            tapResponse({
              next: () => {},
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  onboardingOrganizationCreateOperation: createErrorOperation(
                    operationError,
                    store.onboardingOrganizationCreateOperation().data,
                    { params: input },
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.onboardingOrganizationCreateFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to create organization',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method submitOnboardingLegalProfile
     *
     * @description
     * Upserts organization legal profile then refreshes onboarding status.
     *
     * @param {{ organizationId: string; payload: UpsertOrganizationLegalProfileInput }} input - Legal profile payload.
     */
    submitOnboardingLegalProfile: rxMethod<{
      organizationId: string;
      payload: UpsertOrganizationLegalProfileInput;
    }>(
      pipe(
        tap((params) => {
          patchState(store, {
            onboardingLegalProfileUpsertOperation: createLoadingOperation(
              store.onboardingLegalProfileUpsertOperation().data,
              { params },
            ),
          });
        }),
        exhaustMap(({ organizationId, payload }) =>
          organizationService
            .upsertOrganizationLegalProfile(organizationId, payload)
            .pipe(
              tap((response) => {
                patchState(store, {
                  onboardingLegalProfileUpsertOperation: createSuccessOperation(
                    response,
                    { params: { organizationId, payload } },
                  ),
                });
              }),
              switchMap(() =>
                organizationService.getOnboardingStatus().pipe(
                  tapResponse({
                    next: (status: OrganizationOnboardingStatusOutput) => {
                      patchState(store, {
                        onboardingStatus: status,
                        onboardingStatusLoadOperation: createSuccessOperation(status),
                      });
                    },
                    error: (error: unknown) => {
                      const operationError: OperationError<unknown> =
                        createOperationErrorFromUnknown(error);
                      patchState(store, {
                        onboardingStatusLoadOperation: createErrorOperation(
                          operationError,
                          store.onboardingStatusLoadOperation().data,
                        ),
                      });
                      dispatcher.dispatch(
                        organizationStoreEvents.onboardingStatusLoadFailed(
                          toOperationFailureEventPayload(
                            operationError,
                            'Failed to refresh onboarding status',
                          ),
                        ),
                      );
                    },
                  }),
                  // Keep upsert operation success even if status refresh fails.
                  catchError(() => EMPTY),
                ),
              ),
              tapResponse({
                next: () => {},
                error: (error: unknown) => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    onboardingLegalProfileUpsertOperation: createErrorOperation(
                      operationError,
                      store.onboardingLegalProfileUpsertOperation().data,
                      { params: { organizationId, payload } },
                    ),
                  });
                  dispatcher.dispatch(
                    organizationStoreEvents.onboardingLegalProfileUpsertFailed(
                      toOperationFailureEventPayload(
                        operationError,
                        'Failed to update legal profile',
                      ),
                    ),
                  );
                },
              }),
            ),
        ),
      ),
    ),

    /**
     * Method submitOnboardingFirstFacility
     *
     * @description
     * Creates first onboarding facility then refreshes onboarding status.
     *
     * @param {{ organizationId: string; payload: CreateFirstFacilityOnboardingInput }} input - First facility payload.
     */
    submitOnboardingFirstFacility: rxMethod<{
      organizationId: string;
      payload: CreateFirstFacilityOnboardingInput;
    }>(
      pipe(
        tap((params) => {
          patchState(store, {
            onboardingFirstFacilityCreateOperation: createLoadingOperation(
              store.onboardingFirstFacilityCreateOperation().data,
              { params },
            ),
          });
        }),
        exhaustMap(({ organizationId, payload }) =>
          organizationService
            .createFirstFacilityOnboarding(organizationId, payload)
            .pipe(
              tap((response) => {
                patchState(store, {
                  onboardingFirstFacilityCreateOperation: createSuccessOperation(
                    response,
                    { params: { organizationId, payload } },
                  ),
                });
              }),
              switchMap(() =>
                organizationService.getOnboardingStatus().pipe(
                  tapResponse({
                    next: (status: OrganizationOnboardingStatusOutput) => {
                      patchState(store, {
                        onboardingStatus: status,
                        onboardingStatusLoadOperation: createSuccessOperation(status),
                      });
                    },
                    error: (error: unknown) => {
                      const operationError: OperationError<unknown> =
                        createOperationErrorFromUnknown(error);
                      patchState(store, {
                        onboardingStatusLoadOperation: createErrorOperation(
                          operationError,
                          store.onboardingStatusLoadOperation().data,
                        ),
                      });
                      dispatcher.dispatch(
                        organizationStoreEvents.onboardingStatusLoadFailed(
                          toOperationFailureEventPayload(
                            operationError,
                            'Failed to refresh onboarding status',
                          ),
                        ),
                      );
                    },
                  }),
                  // Keep creation operation success even if status refresh fails.
                  catchError(() => EMPTY),
                ),
              ),
              tapResponse({
                next: () => {},
                error: (error: unknown) => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    onboardingFirstFacilityCreateOperation: createErrorOperation(
                      operationError,
                      store.onboardingFirstFacilityCreateOperation().data,
                      { params: { organizationId, payload } },
                    ),
                  });
                  dispatcher.dispatch(
                    organizationStoreEvents.onboardingFirstFacilityCreateFailed(
                      toOperationFailureEventPayload(
                        operationError,
                        'Failed to create first facility',
                      ),
                    ),
                  );
                },
              }),
            ),
        ),
      ),
    ),
    //#endregion

    //#region Async Methods
    /**
     * Method syncOnboardingStatus
     *
     * @description
     * Promise-based status refresh helper for guards and page orchestration.
     *
     * @returns {Promise<OrganizationOnboardingStatusOutput | null>}
     */
    async syncOnboardingStatus(): Promise<OrganizationOnboardingStatusOutput | null> {
      patchState(store, {
        onboardingStatusLoadOperation: createLoadingOperation(
          store.onboardingStatusLoadOperation().data,
        ),
      });

      return firstValueFrom(
        organizationService.getOnboardingStatus().pipe(
          tapResponse({
            next: (response: OrganizationOnboardingStatusOutput) => {
              patchState(store, {
                onboardingStatus: response,
                onboardingStatusLoadOperation: createSuccessOperation(response),
              });
            },
            error: (error: unknown) => {
              const operationError: OperationError<unknown> =
                createOperationErrorFromUnknown(error);
              patchState(store, {
                onboardingStatusLoadOperation: createErrorOperation(
                  operationError,
                  store.onboardingStatusLoadOperation().data,
                ),
              });
              dispatcher.dispatch(
                organizationStoreEvents.onboardingStatusLoadFailed(
                  toOperationFailureEventPayload(
                    operationError,
                    'Failed to load onboarding status',
                  ),
                ),
              );
            },
          }),
          catchError(() => EMPTY),
        ),
        { defaultValue: null },
      );
    },
    //#endregion

    //#region Synchronous Methods
    /**
     * Method resolveOnboardingRoute
     *
     * @description
     * Returns route for a given onboarding status.
     *
     * @param {OrganizationOnboardingStatusOutput | null} [status] - Optional status.
     * @param {string} [completedRoute='/'] - Route when onboarding is completed.
     *
     * @returns {string}
     */
    resolveOnboardingRoute(
      status: OrganizationOnboardingStatusOutput | null = store.onboardingStatus(),
      completedRoute: string = '/',
    ): string {
      return getRouteFromStatus(status, completedRoute);
    },

    /**
     * Method resetStore
     *
     * @description
     * Resets organization store state.
     */
    resetStore(): void {
      patchState(store, INITIAL_ORGANIZATION_STATE);
    },

    /**
     * Method resetOnboardingOrganizationCreateOperation
     *
     * @description
     * Resets onboarding organization creation operation.
     */
    resetOnboardingOrganizationCreateOperation(): void {
      patchState(store, {
        onboardingOrganizationCreateOperation: createIdleOperation(),
      });
    },

    /**
     * Method resetOnboardingLegalProfileUpsertOperation
     *
     * @description
     * Resets onboarding legal profile upsert operation.
     */
    resetOnboardingLegalProfileUpsertOperation(): void {
      patchState(store, {
        onboardingLegalProfileUpsertOperation: createIdleOperation(),
      });
    },

    /**
     * Method resetOnboardingFirstFacilityCreateOperation
     *
     * @description
     * Resets first facility creation operation.
     */
    resetOnboardingFirstFacilityCreateOperation(): void {
      patchState(store, {
        onboardingFirstFacilityCreateOperation: createIdleOperation(),
      });
    },
    //#endregion
  })),
  //#endregion
);

/**
 * Type OrganizationStoreType
 * @type OrganizationStoreType
 *
 * @description
 * Type alias for organization store instance.
 *
 * @since 1.0.0
 */
export type OrganizationStore = InstanceType<typeof OrganizationStore>;
