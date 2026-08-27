import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { Observable, filter, tap } from 'rxjs';
import { CookieService } from '@core/cookie';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  StoreError,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import {
  LAST_ORGANIZATION_COOKIE_MAX_AGE,
  LAST_ORGANIZATION_COOKIE_NAME,
} from '@features/organization/constants';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { readRouteParam } from '@features/organization/utils';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { activeOrganizationStoreEvents } from './events';
import type { ActiveOrganizationState } from './models';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_ORGANIZATION_STATE
 * @const INITIAL_ACTIVE_ORGANIZATION_STATE
 *
 * @description
 * Initial state for the ActiveOrganizationStore, representing an idle
 * state with no selected organization and no ongoing operations.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ACTIVE_ORGANIZATION_STATE: ActiveOrganizationState = {
  routedOrganizationId: null,
  rememberedOrganizationId: null,
  organizationEntity: null,
  getCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ActiveOrganizationStore
 * @const ActiveOrganizationStore
 *
 * @description
 * Root-level NgRx SignalStore that tracks only the **currently active /
 * selected organization** and its associated dashboard analytics.
 *
 * This store is intentionally minimal — its single responsibility is
 * answering "which organization are we looking at right now?". All list
 * management and CRUD live in the component-scoped {@link OrganizationStore}.
 *
 * The URL wins whenever it names one: the store mirrors `:organizationId` on
 * every navigation and only exposes the cached entity while it matches. A
 * global page — the account, and every other route outside `/organizations` —
 * names none, and there the last organization worked in stands in, so the
 * workspace stays open instead of emptying out. Nothing else sets it: the
 * fallback is a memory of a previous URL, not a second way to choose.
 *
 * Provided at the root level (`providedIn: 'root'`) so that any service or
 * component can read `selectedOrganization` without providing anything.
 *
 * @version 1.2.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveOrganizationStore = signalStore(
  { providedIn: 'root' },

  //#region Features
  withState<ActiveOrganizationState>(INITIAL_ACTIVE_ORGANIZATION_STATE),

  withComputed((store) => ({
    /**
     * Property selectedOrganizationId
     *
     * @description
     * Identity of the active organization: the routed one, or the one last
     * worked in on a page that routes none. Effects that only depend on
     * *which* organization is active — not on its mutable metadata such as
     * name or logo — should track this instead of {@link selectedOrganization},
     * so refreshing the active organization object (e.g. after a logo upload)
     * does not re-trigger organization-scoped reloads.
     *
     * @type {string | null}
     */
    selectedOrganizationId: computed<string | null>(
      () => store.routedOrganizationId() ?? store.rememberedOrganizationId(),
    ),

    /**
     * Property selectedOrganization
     *
     * @description
     * The active organization resource, or `null` while the active identifier
     * designates an organization whose entity is not loaded yet.
     *
     * Gated on that identifier on purpose: without it, switching organization
     * would leave the rail, the navigation and the page header showing the
     * previous organization's name until the fetch resolved.
     *
     * @type {OrganizationOutput | null}
     */
    selectedOrganization: computed<OrganizationOutput | null>(() => {
      const entity: OrganizationOutput | null = store.organizationEntity();
      const activeId: string | null =
        store.routedOrganizationId() ?? store.rememberedOrganizationId();

      return entity !== null && entity.id === activeId ? entity : null;
    }),

    /**
     * Property isLoadingOrganization
     *
     * @description
     * True while the selected organization resource is loading.
     *
     * @type {boolean}
     */
    isLoadingOrganization: computed<boolean>(() => store.getCallState().status === 'pending'),

    /**
     * Property getError
     *
     * @description
     * Error associated with the active-organization fetch operation.
     *
     * @type {StoreError | null}
     */
    getError: computed<StoreError | null>(() => store.getCallState().error),
  })),

  withComputed((store) => ({
    /**
     * Property regionalFormatting
     *
     * @description
     * The active organization's date pattern and timezone, resolved from
     * `settings.regional`. Falls back to
     * {@link DEFAULT_REGIONAL_FORMAT_SETTINGS} while no organization is
     * selected, or its `settings.regional` is absent — the API omits null
     * fields rather than serializing them, so a not-yet-configured
     * organization arrives with no `settings` at all.
     *
     * @type {RegionalFormatSettings}
     */
    regionalFormatting: computed<RegionalFormatSettings>(() => {
      const regional = store.selectedOrganization()?.settings?.regional;

      return regional === undefined || regional === null
        ? DEFAULT_REGIONAL_FORMAT_SETTINGS
        : { dateFormat: regional.dateFormat, timezone: regional.timezone };
    }),
  })),
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
    ) => {
      return {
        /**
         * Method setOrganization
         * @method setOrganization
         *
         * @description
         * Marks the provided organization as active and resets dashboard data
         * when the selection changes.
         *
         * @param {OrganizationOutput} organization - Organization to mark as active.
         *
         * @returns {void} No return value.
         */
        setOrganization(organization: OrganizationOutput): void {
          patchState(store, {
            organizationEntity: organization,
            getCallState: successCallState(organization),
          });
        },

        /**
         * Method resolveOrganization
         * @method resolveOrganization
         *
         * @description
         * Fetches an organization by ID and stores it as the active organization.
         *
         * @param {string} id - Organization identifier.
         *
         * @returns {Observable<OrganizationOutput>} Observable emitting the resolved organization.
         */
        resolveOrganization(id: string): Observable<OrganizationOutput> {
          patchState(store, {
            getCallState: pendingCallState(),
          });

          return organizationService.get(id).pipe(
            tap({
              next: (organization: OrganizationOutput): void => {
                patchState(store, {
                  organizationEntity: organization,
                  getCallState: successCallState(organization),
                });
              },
              error: (error: unknown): void => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, {
                  getCallState: errorCallState(storeError),
                });
                dispatcher.dispatch(
                  activeOrganizationStoreEvents.getFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to load organization'),
                  ),
                );
              },
            }),
          );
        },

        /**
         * Method clearSelectedOrganization
         * @method clearSelectedOrganization
         *
         * @description
         * Clears only the active organization selection and all dashboard data.
         *
         * @returns {void} No return value.
         */
        clearSelectedOrganization(): void {
          patchState(store, {
            organizationEntity: null,
          });
        },

        /**
         * Method clear
         * @method clear
         *
         * @description
         * Resets the entire active-organization store to its idle state.
         *
         * @returns {void} No return value.
         */
        clear(): void {
          patchState(store, {
            organizationEntity: null,
            getCallState: idleCallState(),
          });
        },
      };
    },
  ),

  withHooks((store) => {
    const router: Router = inject<Router>(Router);
    const cookieService: CookieService = inject<CookieService>(CookieService);
    const platformId: object = inject<object>(PLATFORM_ID);

    return {
      onInit(): void {
        patchState(store, {
          rememberedOrganizationId: cookieService.getCookie<string>(LAST_ORGANIZATION_COOKIE_NAME),
        });

        /**
         * Remember the routed organization as the user's default workspace,
         * in state and in the cookie that survives the session.
         *
         * Tracks {@link routedOrganizationId} rather than the active
         * identifier, which already includes what is being written and would
         * feed the effect its own output; nothing is forgotten on
         * deselection, because leaving an organization-scoped page must not
         * close the workspace. Stale identifiers are invalidated by
         * `organizationGuard` when the organization is no longer accessible.
         */
        effect((): void => {
          const organizationId: string | null = store.routedOrganizationId();

          if (organizationId === null) return;

          patchState(store, { rememberedOrganizationId: organizationId });

          if (isPlatformBrowser(platformId)) {
            cookieService.setCookie<string>({
              name: LAST_ORGANIZATION_COOKIE_NAME,
              value: organizationId,
              maxAge: LAST_ORGANIZATION_COOKIE_MAX_AGE,
              path: '/',
              sameSite: 'Lax',
            });
          }
        });

        /**
         * Mirror `:organizationId` from the URL, which owns the answer to
         * "which organization is open".
         *
         * Seeded synchronously from the current router state before the first
         * `NavigationEnd`: on the server the store is built during a render
         * that has already navigated, so waiting for the event would paint a
         * shell with no organization and only fill it after hydration.
         */
        const syncRoutedOrganizationId = (): void => {
          patchState(store, {
            routedOrganizationId: readRouteParam(
              router.routerState.snapshot.root,
              'organizationId',
            ),
          });
        };

        syncRoutedOrganizationId();

        router.events
          .pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            takeUntilDestroyed(),
          )
          .subscribe(syncRoutedOrganizationId);
      },
    };
  }),
  //#endregion
);

/**
 * Type ActiveOrganizationStore
 * @type ActiveOrganizationStore
 *
 * @description
 * Instance type of the {@link ActiveOrganizationStore} signal store.
 *
 * @version 1.0.0
 */
export type ActiveOrganizationStore = InstanceType<typeof ActiveOrganizationStore>;
