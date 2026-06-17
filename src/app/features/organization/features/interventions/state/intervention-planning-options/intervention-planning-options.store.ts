import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { forkJoin, of, pipe, switchMap, tap } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import type { OrganizationMemberOutput } from '@features/organization/models';
import type { InterventionPlanningOptionsState } from './models';

const INITIAL_STATE: InterventionPlanningOptionsState = {
  sites: [],
  targets: [],
  equipmentTypes: [],
  members: [],
  loading: false,
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
    roleLabel: member.roleNames?.join(', ') || 'No assigned role',
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
export const InterventionPlanningOptionsStore = signalStore(
  withState<InterventionPlanningOptionsState>(INITIAL_STATE),
  withMethods(
    (
      store,
      facilities = inject<FacilityService>(FacilityService),
      equipment = inject<EquipmentService>(EquipmentService),
      members = inject<OrganizationMemberService>(OrganizationMemberService),
    ) => ({
      /**
       * Method loadCreationOptions
       * @method loadCreationOptions
       *
       * @description
       * Loads site and member options for the intervention creation form.
       * Resets all options and the loading flag before fetching.
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
              equipmentTypes: [],
              members: [],
              loading: true,
            }),
          ),
          switchMap((organizationId) => {
            if (!organizationId) return of(null);
            return forkJoin({
              organizationId: of(organizationId),
              sites: facilities.list(organizationId, {
                rootsOnly: true,
                page: 1,
                itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
              }),
              members: members.list(organizationId, {
                page: 1,
                itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
              }),
            });
          }),
          tapResponse({
            next: (result) => {
              if (!result) {
                patchState(store, { loading: false });
                return;
              }
              const sites: readonly SelectOption[] = result.sites.member.map((facility) => ({
                label: facility.name,
                value: `/api/facilities/${facility.id}`,
              }));
              patchState(store, {
                sites,
                members: result.members.member.map((member) =>
                  memberOption(member, result.organizationId),
                ),
                loading: false,
              });
            },
            error: () =>
              patchState(store, {
                sites: [],
                targets: [],
                equipmentTypes: [],
                members: [],
                loading: false,
              }),
          }),
        ),
      ),
      /**
       * Method loadWorkspaceOptions
       * @method loadWorkspaceOptions
       *
       * @description
       * Loads site, target (facilities + equipment) and member options for
       * the intervention workspace forms. Resets all options before fetching.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<string | null>}
       */
      loadWorkspaceOptions: rxMethod<string | null>(
        pipe(
          tap(() =>
            patchState(store, {
              sites: [],
              targets: [],
              equipmentTypes: [],
              members: [],
              loading: true,
            }),
          ),
          switchMap((organizationId) => {
            if (!organizationId) return of(null);
            return forkJoin({
              organizationId: of(organizationId),
              sites: facilities.list(organizationId, {
                rootsOnly: true,
                page: 1,
                itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
              }),
              facilities: facilities.list(organizationId, {
                page: 1,
                itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
              }),
              equipment: equipment.list(organizationId, {
                page: 1,
                itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
              }),
              equipmentTypes: equipment.listTypes(organizationId, {
                page: 1,
                itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
              }),
              members: members.list(organizationId, {
                page: 1,
                itemsPerPage: PLANNING_OPTION_PAGE_SIZE,
              }),
            });
          }),
          tapResponse({
            next: (result) => {
              if (!result) {
                patchState(store, { loading: false });
                return;
              }
              patchState(store, {
                sites: result.sites.member.map((facility) => ({
                  label: facility.name,
                  value: `/api/facilities/${facility.id}`,
                })),
                targets: [
                  ...result.facilities.member.map((facility) => ({
                    label: facility.name,
                    value: `/api/facilities/${facility.id}`,
                  })),
                  ...result.equipment.member.map((item) => ({
                    label: `${item.type} · ${item.serialNumber || item.id}`,
                    value: `/api/equipment/${item.id}`,
                  })),
                ],
                equipmentTypes: result.equipmentTypes.member.map((option) => ({
                  label: option.label,
                  value: option.value,
                })),
                members: result.members.member.map((member) =>
                  memberOption(member, result.organizationId),
                ),
                loading: false,
              });
            },
            error: () =>
              patchState(store, {
                sites: [],
                targets: [],
                equipmentTypes: [],
                members: [],
                loading: false,
              }),
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
