import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { forkJoin, of, pipe, switchMap, tap } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { SelectOption } from '@features/organization/features/interventions/models';
import type { InterventionPlanningOptionsState } from './models';

const INITIAL_STATE: InterventionPlanningOptionsState = {
  sites: [],
  targets: [],
  members: [],
  referencePacks: [],
  loading: false,
};

const PLANNING_OPTION_PAGE_SIZE = 100;

/**
 * Loads and maps the organization resources used by intervention planning forms.
 */
export const InterventionPlanningOptionsStore = signalStore(
  withState<InterventionPlanningOptionsState>(INITIAL_STATE),
  withMethods(
    (
      store,
      facilities = inject(FacilityService),
      equipment = inject(EquipmentService),
      members = inject(OrganizationMemberService),
      interventions = inject(InterventionService),
    ) => ({
      loadCreationOptions: rxMethod<string | null>(
        pipe(
          tap(() =>
            patchState(store, {
              sites: [],
              targets: [],
              members: [],
              referencePacks: [],
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
              referencePacks: interventions.listReferencePacks(),
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
                members: result.members.member.map((member) => ({
                  label: member.userId,
                  value: `/api/organizations/${result.organizationId}/members/${member.id}`,
                })),
                referencePacks: result.referencePacks.member.map((pack) => ({
                  label: pack.name,
                  value: `/api/reference-packs/${pack.id}`,
                })),
                loading: false,
              });
            },
            error: () =>
              patchState(store, {
                sites: [],
                targets: [],
                members: [],
                referencePacks: [],
                loading: false,
              }),
          }),
        ),
      ),
      loadWorkspaceOptions: rxMethod<string | null>(
        pipe(
          tap(() => patchState(store, { sites: [], targets: [], members: [], loading: true })),
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
                members: result.members.member.map((member) => ({
                  label: member.userId,
                  value: `/api/organizations/${result.organizationId}/members/${member.id}`,
                })),
                loading: false,
              });
            },
            error: () => patchState(store, { sites: [], targets: [], members: [], loading: false }),
          }),
        ),
      ),
    }),
  ),
);

export type InterventionPlanningOptionsStoreType = InstanceType<typeof InterventionPlanningOptionsStore>;
