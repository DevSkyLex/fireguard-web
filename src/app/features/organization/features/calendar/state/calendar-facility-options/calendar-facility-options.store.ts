import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, map, pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';

/**
 * Interface CalendarFacilityOptionsState
 * @interface CalendarFacilityOptionsState
 *
 * @description
 * Owns the current server page and independently resolved selected facility for an event form.
 */
interface CalendarFacilityOptionsState {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization that owns the current picker context.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Invalidates responses from abandoned form contexts.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly revision: number;
  /**
   * Property search
   * @readonly
   *
   * @description
   * Current server search text.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly search: string;
  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based server page requested by the picker.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly page: number;
  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Server count for the active search.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly totalItems: number;
  /**
   * Property selectedId
   * @readonly
   *
   * @description
   * Association retained independently of the current server search page.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly selectedId: string | null;
  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Server-page request and recoverable failure.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<readonly { readonly value: string; readonly label: string }[]>}
   */
  readonly loadCallState: CallState<readonly { readonly value: string; readonly label: string }[]>;
  /**
   * Property selectedCallState
   * @readonly
   *
   * @description
   * Selected-value resolution independent of the active search page.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<{ readonly value: string; readonly label: string }>}
   */
  readonly selectedCallState: CallState<{ readonly value: string; readonly label: string }>;
}

/**
 * Constant CalendarFacilityOptionsStore
 *
 * @description
 * Page-scoped, lazy facility picker with cancellable pages and selected-value resolution.
 */
export const CalendarFacilityOptionsStore = signalStore(
  withState<CalendarFacilityOptionsState>(() => ({
    organizationId: null,
    revision: 0,
    search: '',
    page: 1,
    totalItems: 0,
    selectedId: null,
    loadCallState: idleCallState<readonly { readonly value: string; readonly label: string }[]>(),
    selectedCallState: idleCallState<{ readonly value: string; readonly label: string }>(),
  })),
  withComputed((store) => ({
    /**
     * Property options
     *
     * @description
     * Current page plus a selected facility that may lie outside it.
     */
    options: computed(() => {
      const page = store.loadCallState().data ?? [];
      const selected = store.selectedCallState().data;
      return selected && !page.some((option) => option.value === selected.value)
        ? [selected, ...page]
        : page;
    }),
    /**
     * Property hasNextPage
     *
     * @description
     * Whether the active server search has another page.
     */
    hasNextPage: computed(() => store.page() * 25 < store.totalItems()),
  })),
  withMethods((store, service = inject(FacilityService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Replaces the active page and cancels obsolete reads, including on close.
     *
     * @access public
     * @since unreleased
     *
     * @type {RxMethod<{ organizationId: string; search: string; page: number } | null>}
     */
    load: rxMethod<{ organizationId: string; search: string; page: number } | null>(
      pipe(
        switchMap((command) => {
          if (!command) return EMPTY;
          if (command.organizationId !== store.organizationId()) return EMPTY;
          const revision = store.revision();
          patchState(store, {
            search: command.search,
            page: command.page,
            loadCallState: pendingCallState(store.loadCallState().data),
          });
          return service
            .list(command.organizationId, {
              search: command.search,
              page: command.page,
              itemsPerPage: 25,
            })
            .pipe(
              tapResponse({
                next: (response) => {
                  if (revision !== store.revision()) return;
                  patchState(store, {
                    totalItems: response.totalItems,
                    loadCallState: successCallState(
                      response.member.map((facility) => ({
                        value: facility.id,
                        label: facility.name,
                      })),
                    ),
                  });
                },
                error: (error: unknown) => {
                  if (revision !== store.revision()) return;
                  patchState(store, {
                    loadCallState: errorCallState(toStoreError(error), store.loadCallState().data),
                  });
                },
              }),
            );
        }),
      ),
    ),
    /**
     * Method resolveSelected
     * @method resolveSelected
     *
     * @description
     * Resolves an existing facility even when it is absent from the current page.
     *
     * @access public
     * @since unreleased
     *
     * @type {RxMethod<string | null>}
     */
    resolveSelected: rxMethod<string | null>(
      pipe(
        map((id) => ({ id, organizationId: store.organizationId(), revision: store.revision() })),
        switchMap(({ id, organizationId, revision }) => {
          if (!id || !organizationId) {
            patchState(store, { selectedId: null, selectedCallState: idleCallState() });
            return EMPTY;
          }
          if (store.selectedId() === id && store.selectedCallState().status === 'success')
            return EMPTY;
          patchState(store, { selectedId: id, selectedCallState: pendingCallState() });
          return service.get(organizationId, id).pipe(
            tapResponse({
              next: (facility) => {
                if (revision !== store.revision()) return;
                patchState(store, {
                  selectedCallState: successCallState({ value: facility.id, label: facility.name }),
                });
              },
              error: (error: unknown) => {
                if (revision !== store.revision()) return;
                patchState(store, { selectedCallState: errorCallState(toStoreError(error)) });
              },
            }),
          );
        }),
      ),
    ),
  })),
  withMethods((store, platformId = inject(PLATFORM_ID)) => ({
    /**
     * Method open
     * @method open
     *
     * @description
     * Starts a fresh form context and requests its first page and selected value.
     *
     * @access public
     * @since unreleased
     *
     * @param {string} organizationId - Owning organization.
     * @param {string | null} selectedId - Existing facility association.
     *
     * @returns {void}
     */
    open(organizationId: string, selectedId: string | null): void {
      if (!isPlatformBrowser(platformId)) return;
      patchState(store, {
        organizationId,
        revision: store.revision() + 1,
        search: '',
        page: 1,
        totalItems: 0,
        selectedId: null,
        loadCallState: idleCallState(),
        selectedCallState: idleCallState(),
      });
      store.load({ organizationId, search: '', page: 1 });
      store.resolveSelected(selectedId);
    },
    /**
     * Method close
     * @method close
     *
     * @description
     * Clears the abandoned picker context and cancels both reads.
     *
     * @access public
     * @since unreleased
     *
     * @returns {void}
     */
    close(): void {
      patchState(store, {
        organizationId: null,
        revision: store.revision() + 1,
        search: '',
        page: 1,
        totalItems: 0,
        selectedId: null,
        loadCallState: idleCallState(),
        selectedCallState: idleCallState(),
      });
      store.load(null);
      store.resolveSelected(null);
    },
    /**
     * Method requestPage
     * @method requestPage
     *
     * @description
     * Loads a requested server page for the active form.
     *
     * @access public
     * @since unreleased
     *
     * @param {number} page - One-based page.
     * @param {string} search - Server search text.
     *
     * @returns {void}
     */
    requestPage(page: number, search: string = store.search()): void {
      const organizationId = store.organizationId();
      if (!organizationId || page < 1) return;
      store.load({ organizationId, search, page });
    },
  })),
);
