import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { NavigationCountersService } from '@features/organization/data-access/services/navigation-counters/navigation-counters.service';
import type { OrganizationNavigationCountersOutput } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';

/**
 * Store NavigationCountersStore
 * @const NavigationCountersStore
 *
 * @description
 * Shell-scoped store for the sidebar navigation badge counters. Reloads when
 * the active organization changes; counters read `0` until loaded so badges
 * simply stay hidden.
 *
 * Provided by `provideOrganizationFeature()` — not root — because its hooks
 * inject the organization context port bound there.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const NavigationCountersStore = signalStore(
  //#region State
  withQueryState<OrganizationNavigationCountersOutput>(),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed openInterventions
     *
     * @description
     * Interventions neither published nor abandoned; `0` until loaded.
     *
     * @type {Signal<number>}
     */
    openInterventions: computed<number>(() => store.queryData()?.openInterventions ?? 0),

    /**
     * Computed openNonConformities
     *
     * @description
     * Non-conformities open or in progress; `0` until loaded.
     *
     * @type {Signal<number>}
     */
    openNonConformities: computed<number>(() => store.queryData()?.openNonConformities ?? 0),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(NavigationCountersService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads the counters of one organization. A `null` id is ignored so a
     * context signal can be bound straight in.
     *
     * @param {string | null} organizationId - Active organization identifier.
     *
     * @returns {void}
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (organizationId === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.getCounters(organizationId).pipe(
            tapResponse({
              next: (counters: OrganizationNavigationCountersOutput) =>
                patchState(store, setSuccessQuery(counters)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion

  //#region Hooks
  withHooks((store, context = inject(ORGANIZATION_CONTEXT_PORT)) => ({
    onInit(): void {
      store.load(computed((): string | null => context.selectedOrganization()?.id ?? null));
    },
  })),
  //#endregion
);

/**
 * Type NavigationCountersStoreType
 *
 * @description
 * Injectable instance type of {@link NavigationCountersStore}.
 */
export type NavigationCountersStoreType = InstanceType<typeof NavigationCountersStore>;
