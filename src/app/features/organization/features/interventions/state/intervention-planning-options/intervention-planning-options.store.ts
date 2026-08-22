import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, forkJoin, of, pipe, switchMap, tap, type Observable } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { OrganizationMemberService } from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import {
  InterventionLabelService,
  InterventionTemplateService,
} from '@features/organization/features/interventions/data-access';
import type {
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import type { OrganizationMemberOutput } from '@features/organization/models';
import { interventionPlanningOptionsStoreEvents } from './events';
import type { InterventionPlanningOptionsState } from './models';

const INITIAL_STATE: InterventionPlanningOptionsState = {
  sites: [],
  targets: [],
  members: [],
  labels: [],
  templates: [],
  loadCallState: idleCallState(),
};

/**
 * Constant PLANNING_OPTION_PAGE_SIZE
 * @const PLANNING_OPTION_PAGE_SIZE
 *
 * @description
 * Maximum number of items fetched per resource type when loading planning
 * options. Keeps API responses bounded while covering typical organization sizes.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const PLANNING_OPTION_PAGE_SIZE = 100;

/**
 * Function memberOption
 * @function memberOption
 *
 * @description
 * Maps a raw organization member to a {@link MemberSelectOption} for
 * use in planning and participant selectors. Derives display name and
 * initials from available member properties.
 *
 * @since 1.0.0
 *
 * @param {OrganizationMemberOutput} member - Raw organization member.
 * @param {string} organizationId - Organization owning the member.
 *
 * @returns {MemberSelectOption} Mapped selector option.
 */
function memberOption(
  member: OrganizationMemberOutput,
  organizationId: string,
): MemberSelectOption {
  const displayName: string =
    member.displayName?.trim() ||
    [member.firstName, member.lastName].filter(Boolean).join(' ').trim() ||
    member.userId;
  const initials: string =
    [member.firstName, member.lastName]
      .filter(Boolean)
      .map((part) => part?.charAt(0))
      .join('')
      .toUpperCase() ||
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() ||
    '?';

  return {
    label: displayName,
    value: `/api/organizations/${organizationId}/members/${member.id}`,
    displayName,
    roleLabel: member.roleNames?.join(', ') || $localize`:@@intervention.noRole:No assigned role`,
    avatarUrl: member.avatarUrl ?? null,
    initials,
  };
}

/**
 * Store InterventionPlanningOptionsStore
 * @const InterventionPlanningOptionsStore
 *
 * @description
 * Component-scoped NgRx SignalStore that loads and maps organization
 * resources (sites, equipment, members) into the selector options used
 * by intervention planning and workspace forms. Two load methods cover
 * the creation flow (sites + members) and the workspace flow (sites +
 * targets + members).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
/**
 * Function optional
 * @function optional
 *
 * @description
 * Lets one option source fail without taking its siblings down. `forkJoin`
 * errors as a whole the moment any input does, which had a
 * disproportionate consequence here: a failing template list left the Site,
 * Responsible and Label filter chips with no values to offer at all. A
 * failure is recorded rather than swallowed — the caller still dispatches
 * `loadFailed` — but the sources that did answer are kept.
 *
 * @since 11.1.0
 *
 * @template T
 * @param {Observable<T>} source - One option list request.
 * @param {unknown[]} failures - Collects the errors, for the caller to report.
 *
 * @returns {Observable<T | null>} The response, or `null` when it failed.
 */
/** How many option lists {@link InterventionPlanningOptionsStore.loadCreationOptions} joins — all of them failing is a real error, one is a degradation. */
const CREATION_OPTION_SOURCES = 4;

/** The same count for `loadWorkspaceOptions`, which adds the facility and equipment target lists. */
const WORKSPACE_OPTION_SOURCES = 5;

function optional<T>(source: Observable<T>, failures: unknown[]): Observable<T | null> {
  return source.pipe(
    catchError((error: unknown): Observable<null> => {
      failures.push(error);

      return of(null);
    }),
  );
}

export const InterventionPlanningOptionsStore = signalStore(
  withState<InterventionPlanningOptionsState>(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * Computed loading.
     *
     * @description
     * True while a planning-options load is in flight.
     */
    loading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /**
     * Computed loadError.
     *
     * @description
     * Normalized error of the last load when it failed, otherwise `null`. Lets
     * the form distinguish genuinely empty option lists from a failed fetch.
     */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();
      return isCallError(state) ? state.error : null;
    }),

    /**
     * Computed hasTemplates.
     *
     * @description
     * True once the creation flow has at least one intervention template to
     * offer — the "start from a template" picker stays hidden otherwise.
     */
    hasTemplates: computed<boolean>(() => store.templates().length > 0),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      facilities = inject<FacilityService>(FacilityService),
      equipment = inject<EquipmentService>(EquipmentService),
      members = inject<OrganizationMemberService>(OrganizationMemberService),
      labelService = inject<InterventionLabelService>(InterventionLabelService),
      templateService = inject<InterventionTemplateService>(InterventionTemplateService),
    ) => ({
      /**
       * Method loadCreationOptions
       * @method loadCreationOptions
       *
       * @description
       * Loads site, member and label options for the intervention creation
       * form and the list's filter bar. Resets all options and the loading
       * flag before fetching.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<string | null>}
       */
      loadCreationOptions: rxMethod<string | null>(
        pipe(
          tap(() =>
            patchState(store, {
              sites: [],
              targets: [],
              members: [],
              labels: [],
              templates: [],
              loadCallState: pendingCallState(),
            }),
          ),
          switchMap((organizationId) => {
            if (!organizationId) return of(null);
            const failures: unknown[] = [];

            return forkJoin({
              organizationId: of(organizationId),
              failures: of(failures),
              sites: optional(
                facilities.list(organizationId, {
                  rootsOnly: true,
                  page: 1,
                  itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
                }),
                failures,
              ),
              members: optional(
                members.list(organizationId, {
                  page: 1,
                  itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
                }),
                failures,
              ),
              labels: optional(labelService.list(`/api/organizations/${organizationId}`), failures),
              templates: optional(
                templateService.list(`/api/organizations/${organizationId}`, {
                  itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
                }),
                failures,
              ),
            });
          }),
          tapResponse({
            next: (result) => {
              if (!result) {
                patchState(store, { loadCallState: successCallState(null) });
                return;
              }
              const sites: readonly SelectOption[] = (result.sites?.member ?? []).map(
                (facility) => ({
                  label: facility.name,
                  value: `/api/facilities/${facility.id}`,
                }),
              );
              patchState(store, {
                sites,
                members: (result.members?.member ?? []).map((member) =>
                  memberOption(member, result.organizationId),
                ),
                labels: result.labels?.member ?? [],
                templates: result.templates?.member ?? [],
                loadCallState:
                  result.failures.length === CREATION_OPTION_SOURCES
                    ? errorCallState(toStoreError(result.failures[0]))
                    : successCallState(null),
              });

              const [firstFailure] = result.failures;
              if (firstFailure === undefined) return;

              dispatcher.dispatch(
                interventionPlanningOptionsStoreEvents.loadFailed(
                  toStoreFailureEventPayload(
                    toStoreError(firstFailure),
                    'Some planning options could not be loaded',
                  ),
                ),
              );
            },
            error: (error: unknown) => {
              const storeError = toStoreError(error);
              patchState(store, {
                sites: [],
                targets: [],
                members: [],
                labels: [],
                templates: [],
                loadCallState: errorCallState(storeError),
              });
              dispatcher.dispatch(
                interventionPlanningOptionsStoreEvents.loadFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load planning options'),
                ),
              );
            },
          }),
        ),
      ),
      /**
       * Method loadWorkspaceOptions
       * @method loadWorkspaceOptions
       *
       * @description
       * Loads site, target (facilities + equipment), member and label options
       * for the intervention workspace forms. Resets all options before
       * fetching. Labels feed the detail page's sidebar label editor.
       *
       * @access public
       * @since 1.1.0
       *
       * @type {RxMethod<string | null>}
       */
      loadWorkspaceOptions: rxMethod<string | null>(
        pipe(
          tap(() =>
            patchState(store, {
              sites: [],
              targets: [],
              members: [],
              labels: [],
              templates: [],
              loadCallState: pendingCallState(),
            }),
          ),
          switchMap((organizationId) => {
            if (!organizationId) return of(null);
            const failures: unknown[] = [];

            return forkJoin({
              organizationId: of(organizationId),
              failures: of(failures),
              sites: optional(
                facilities.list(organizationId, {
                  rootsOnly: true,
                  page: 1,
                  itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
                }),
                failures,
              ),
              facilities: optional(
                facilities.list(organizationId, {
                  page: 1,
                  itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
                }),
                failures,
              ),
              equipment: optional(
                equipment.list(organizationId, {
                  page: 1,
                  itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
                }),
                failures,
              ),
              members: optional(
                members.list(organizationId, {
                  page: 1,
                  itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
                }),
                failures,
              ),
              labels: optional(labelService.list(`/api/organizations/${organizationId}`), failures),
            });
          }),
          tapResponse({
            next: (result) => {
              if (!result) {
                patchState(store, { loadCallState: successCallState(null) });
                return;
              }
              patchState(store, {
                sites: (result.sites?.member ?? []).map((facility) => ({
                  label: facility.name,
                  value: `/api/facilities/${facility.id}`,
                })),
                targets: [
                  ...(result.facilities?.member ?? []).map((facility) => ({
                    label: facility.name,
                    value: `/api/facilities/${facility.id}`,
                  })),
                  ...(result.equipment?.member ?? []).map((item) => ({
                    label: `${item.type} · ${item.serialNumber || item.id}`,
                    value: `/api/equipment/${item.id}`,
                  })),
                ],
                members: (result.members?.member ?? []).map((member) =>
                  memberOption(member, result.organizationId),
                ),
                labels: result.labels?.member ?? [],
                loadCallState:
                  result.failures.length === WORKSPACE_OPTION_SOURCES
                    ? errorCallState(toStoreError(result.failures[0]))
                    : successCallState(null),
              });

              const [firstFailure] = result.failures;
              if (firstFailure === undefined) return;

              dispatcher.dispatch(
                interventionPlanningOptionsStoreEvents.loadFailed(
                  toStoreFailureEventPayload(
                    toStoreError(firstFailure),
                    'Some workspace options could not be loaded',
                  ),
                ),
              );
            },
            error: (error: unknown) => {
              const storeError = toStoreError(error);
              patchState(store, {
                sites: [],
                targets: [],
                members: [],
                labels: [],
                templates: [],
                loadCallState: errorCallState(storeError),
              });
              dispatcher.dispatch(
                interventionPlanningOptionsStoreEvents.loadFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load planning options'),
                ),
              );
            },
          }),
        ),
      ),
    }),
  ),
);

/**
 * Type InterventionPlanningOptionsStoreType
 * @type InterventionPlanningOptionsStoreType
 *
 * @description
 * Injectable instance type exposed by {@link InterventionPlanningOptionsStore}.
 *
 * @since 1.0.0
 */
export type InterventionPlanningOptionsStoreType = InstanceType<
  typeof InterventionPlanningOptionsStore
>;
