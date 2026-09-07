import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, timer } from 'rxjs';
import {
  resetQuery,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
  withQueryState,
} from '@core/request-state';
import {
  OrganizationSetupService,
  type SetupFacilityAddressMatch,
} from '@features/organization/setup';
import { facilityAddressSearchEvents } from './events';

/**
 * Store FacilityAddressSearchStore
 * @const FacilityAddressSearchStore
 * @description Page-scoped address suggestions. Input changes cancel older responses immediately; only a query stable for 500 milliseconds reaches the provider. No search runs during SSR or enters TransferState.
 * @since 1.0.0
 */
export const FacilityAddressSearchStore = signalStore(
  withQueryState<readonly SetupFacilityAddressMatch[]>(),
  withComputed((store) => ({
    /**
     * Property matches
     * @readonly
     * @description Current suggestions, cleared as soon as the address draft changes.
     * @access public
     * @since 1.0.0
     * @type {Signal<readonly SetupFacilityAddressMatch[]>}
     */
    matches: computed<readonly SetupFacilityAddressMatch[]>(() => store.queryData() ?? []),
    /**
     * Property loading
     * @readonly
     * @description Whether the debounce or provider request is pending.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    loading: computed(() => store.isQueryLoading()),
    /**
     * Property error
     * @readonly
     * @description Normalized provider or API failure, distinct from a successful empty result.
     * @access public
     * @since 1.0.0
     * @type {Signal<StoreError | null>}
     */
    error: computed(() => store.queryError()),
    /**
     * Property notFound
     * @readonly
     * @description True only after a successful search returned no suggestions.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    notFound: computed(() => store.isQueryLoaded() && store.queryData()?.length === 0),
  })),
  withMethods(
    (
      store,
      service = inject(OrganizationSetupService),
      platformId = inject<object>(PLATFORM_ID),
    ) => {
      /**
       * Method search
       * @method search
       * @description Debounces a trimmed address query of at least three characters for 500 milliseconds. Every input, including null or a shorter query, cancels the previous request immediately.
       * @access public
       * @since 1.0.0
       * @param {{readonly organizationId: string; readonly query: string} | null} params - Address query or cancellation.
       * @returns {void}
       */
      const dispatcher: Dispatcher = inject(Dispatcher);
      const search = rxMethod<{
        readonly organizationId: string;
        readonly query: string;
      } | null>(
        pipe(
          switchMap((params) => {
            patchState(store, resetQuery());
            const query = params?.query.trim() ?? '';
            if (!isPlatformBrowser(platformId) || !params?.organizationId || query.length < 3)
              return EMPTY;

            patchState(store, setPendingQuery());
            return timer(500).pipe(
              switchMap(() => service.searchFacilityAddresses(params.organizationId, query)),
              tapResponse({
                next: (matches) => patchState(store, setSuccessQuery(matches)),
                error: (error: unknown) => {
                  const failure: StoreError = toStoreError(error);
                  patchState(store, setErrorQuery(failure));
                  dispatcher.dispatch(
                    facilityAddressSearchEvents.failed(
                      toStoreFailureEventPayload(
                        failure,
                        $localize`:@@onboarding.facilitiesForm.addressFailed:Address search is unavailable. Try again.`,
                      ),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      );

      return {
        search,
        /**
         * Method clear
         * @method clear
         * @description Cancels any pending lookup and clears results when the draft, organization or step changes.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        clear(): void {
          search(null);
        },
      };
    },
  ),
);

/**
 * Type FacilityAddressSearchStoreType
 * @type FacilityAddressSearchStoreType
 * @description Injectable instance of the page-scoped address lookup store.
 * @since 1.0.0
 */
export type FacilityAddressSearchStoreType = InstanceType<typeof FacilityAddressSearchStore>;
