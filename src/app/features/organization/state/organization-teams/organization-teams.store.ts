import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  successFeedback,
} from '@core/request-state';
import { TeamService } from '@features/organization/data-access';
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  TeamMemberOutput,
  TeamOutput,
  UpdateTeamInput,
} from '@features/organization/models';
import { organizationTeamsStoreEvents } from './events';
import type { OrganizationTeamsState } from './models';

/** Fallback error message dispatched with `mutationFailed` when a `StoreError` carries none. */
const MUTATION_FAILURE_FALLBACK = $localize`:@@org.teams.toast.mutationFailed:The action could not be completed.`;

/**
 * Initial organization teams workflow state. Teams and their member rosters
 * are held in `withEntities` collections (`team`, `teamMember`); only the
 * currently selected team id and the per-operation call states live in plain
 * state.
 */
const INITIAL_STATE: OrganizationTeamsState = {
  selectedTeamId: null,
  listCallState: idleCallState(),
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  removeCallState: idleCallState(),
  membersCallState: idleCallState(),
  addMemberCallState: idleCallState(),
  removeMemberCallState: idleCallState(),
};

/**
 * `teamMember` selectId — `TeamMemberOutput` carries no `id` field of its
 * own; membership rows are addressed by the underlying member's id
 * (`memberId`), matching `TeamService.removeMember`'s own parameter.
 */
const selectTeamMemberId = (member: TeamMemberOutput): string => member.memberId;

/** Typed empty roster, so `setAllEntities` does not infer `Entity` as `never`. */
const NO_TEAM_MEMBERS: TeamMemberOutput[] = [];

/**
 * Store OrganizationTeamsStore
 *
 * @description
 * Component-scoped workflow store for the dedicated teams page
 * (`/organizations/:organizationId/teams`): loads the organization's teams,
 * owns team CRUD (create, rename/redescribe, delete) and the member panel for
 * whichever team is currently selected (load roster, add member, remove
 * member). Teams and team members are kept as `withEntities` collections for
 * O(1) id-based updates; every mutation reports through its own named
 * `CallState` so the page can disable and busy-mark each action
 * independently, and every mutation dispatches a typed event: a
 * per-operation success event the page uses to close its dialog and confirm
 * with a toast, or the shared `mutationFailed` event for a live-region error
 * announcement (inline `*Error` computeds still carry the detail for the
 * page's own error state).
 *
 * `memberCount` on a `TeamOutput` is kept in sync by patching the affected
 * team entity locally (`updateEntity` +/- 1) on `addMember`/`removeMember`
 * success, rather than reloading the teams list — the same "patch in place,
 * never refetch after a mutation" approach `OrganizationMembersStore` uses
 * for its own entity collections. This is distinct from
 * `OrganizationTeamStore` (`state/organization-team`), which manages RBAC
 * roles under the unrelated `/team` route — see `FEATURE.md`'s naming
 * disambiguation.
 *
 * @since 1.0.0
 */
export const OrganizationTeamsStore = signalStore(
  withEntities({ entity: type<TeamOutput>(), collection: 'team' }),
  withEntities({ entity: type<TeamMemberOutput>(), collection: 'teamMember' }),
  withState(INITIAL_STATE),
  withComputed((store) => ({
    /** Loaded organization teams. */
    teams: computed(() => store.teamEntities()),
    /** Member roster of the currently selected team. */
    members: computed(() => store.teamMemberEntities()),
    /** Whether the teams list is loading. */
    isLoading: computed(() => isCallPending(store.listCallState())),
    /** Whether a team creation is pending. */
    isCreating: computed(() => isCallPending(store.createCallState())),
    /** Whether a team update is pending. */
    isUpdating: computed(() => isCallPending(store.updateCallState())),
    /** Whether a team deletion is pending. */
    isRemoving: computed(() => isCallPending(store.removeCallState())),
    /** Whether the selected team's member roster is loading. */
    isLoadingMembers: computed(() => isCallPending(store.membersCallState())),
    /** Whether a member is being added to the selected team. */
    isAddingMember: computed(() => isCallPending(store.addMemberCallState())),
    /** Whether a member is being removed from the selected team. */
    isRemovingMember: computed(() => isCallPending(store.removeMemberCallState())),
    /** Error from the last teams list load. */
    listError: computed(() => store.listCallState().error),
    /** Error from the last team creation attempt. */
    createError: computed(() => store.createCallState().error),
    /** Error from the last team update attempt. */
    updateError: computed(() => store.updateCallState().error),
    /** Error from the last team deletion attempt. */
    removeError: computed(() => store.removeCallState().error),
    /** Error from the last member roster load. */
    membersError: computed(() => store.membersCallState().error),
    /** Error from the last add-member attempt. */
    addMemberError: computed(() => store.addMemberCallState().error),
    /** Error from the last remove-member attempt. */
    removeMemberError: computed(() => store.removeMemberCallState().error),
  })),
  withMethods(
    (
      store,
      teamService = inject<TeamService>(TeamService),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /** Loads the organization's teams. */
      loadTeams: rxMethod<{ organizationId: string }>(
        pipe(
          tap(() => patchState(store, { listCallState: pendingCallState() })),
          switchMap(({ organizationId }) =>
            teamService.list(organizationId).pipe(
              tapResponse({
                next: (response) =>
                  patchState(store, setAllEntities([...response.member], { collection: 'team' }), {
                    listCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Creates a team inside the organization. */
      createTeam: rxMethod<{ organizationId: string; input: CreateTeamInput }>(
        pipe(
          tap(() => patchState(store, { createCallState: pendingCallState() })),
          exhaustMap(({ organizationId, input }) =>
            teamService.create(organizationId, input).pipe(
              tapResponse({
                next: (team) => {
                  patchState(store, addEntity(team, { collection: 'team' }), {
                    createCallState: successCallState(team),
                  });
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.teamCreated(
                      successFeedback($localize`:@@org.teams.toast.created:Team created`),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.mutationFailed(
                      toStoreFailureEventPayload(storeError, MUTATION_FAILURE_FALLBACK),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
      /** Renames a team or changes its description. */
      updateTeam: rxMethod<{ organizationId: string; teamId: string; input: UpdateTeamInput }>(
        pipe(
          tap(() => patchState(store, { updateCallState: pendingCallState() })),
          exhaustMap(({ organizationId, teamId, input }) =>
            teamService.update(organizationId, teamId, input).pipe(
              tapResponse({
                next: (team) => {
                  patchState(
                    store,
                    updateEntity({ id: team.id, changes: team }, { collection: 'team' }),
                    { updateCallState: successCallState(team) },
                  );
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.teamUpdated(
                      successFeedback($localize`:@@org.teams.toast.updated:Team updated`),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { updateCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.mutationFailed(
                      toStoreFailureEventPayload(storeError, MUTATION_FAILURE_FALLBACK),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
      /**
       * Deletes a team. Clears the member panel selection and roster when the
       * removed team was the selected one.
       */
      removeTeam: rxMethod<{ organizationId: string; teamId: string }>(
        pipe(
          tap(() => patchState(store, { removeCallState: pendingCallState() })),
          exhaustMap(({ organizationId, teamId }) =>
            teamService.remove(organizationId, teamId).pipe(
              tapResponse({
                next: () => {
                  const wasSelected = store.selectedTeamId() === teamId;
                  patchState(store, removeEntity(teamId, { collection: 'team' }), {
                    removeCallState: successCallState(null),
                    ...(wasSelected ? { selectedTeamId: null } : {}),
                  });
                  if (wasSelected) {
                    patchState(
                      store,
                      setAllEntities(NO_TEAM_MEMBERS, {
                        collection: 'teamMember',
                        selectId: selectTeamMemberId,
                      }),
                      { membersCallState: idleCallState() },
                    );
                  }
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.teamRemoved(
                      successFeedback($localize`:@@org.teams.toast.removed:Team deleted`),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { removeCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.mutationFailed(
                      toStoreFailureEventPayload(storeError, MUTATION_FAILURE_FALLBACK),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
      /**
       * Selects a team for the member panel and loads its member roster.
       * Passing `null` closes the panel and clears the roster without a
       * request.
       */
      loadMembers: rxMethod<{ organizationId: string; teamId: string | null }>(
        pipe(
          tap(({ teamId }) => patchState(store, { selectedTeamId: teamId })),
          switchMap(({ organizationId, teamId }) => {
            if (!teamId) {
              patchState(
                store,
                setAllEntities(NO_TEAM_MEMBERS, {
                  collection: 'teamMember',
                  selectId: selectTeamMemberId,
                }),
                { membersCallState: idleCallState() },
              );
              return EMPTY;
            }
            patchState(store, { membersCallState: pendingCallState() });
            return teamService.listMembers(organizationId, teamId).pipe(
              tapResponse({
                next: (response) =>
                  patchState(
                    store,
                    setAllEntities([...response.member], {
                      collection: 'teamMember',
                      selectId: selectTeamMemberId,
                    }),
                    { membersCallState: successCallState(null) },
                  ),
                error: (error: unknown) =>
                  patchState(store, { membersCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
      /**
       * Adds a member to the selected team and increments its `memberCount`
       * locally.
       */
      addMember: rxMethod<{ organizationId: string; teamId: string; input: AddTeamMemberInput }>(
        pipe(
          tap(() => patchState(store, { addMemberCallState: pendingCallState() })),
          exhaustMap(({ organizationId, teamId, input }) =>
            teamService.addMember(organizationId, teamId, input).pipe(
              tapResponse({
                next: (member) => {
                  const team = store.teamEntityMap()[teamId];
                  patchState(
                    store,
                    addEntity(member, { collection: 'teamMember', selectId: selectTeamMemberId }),
                    ...(team
                      ? [
                          updateEntity(
                            { id: teamId, changes: { memberCount: team.memberCount + 1 } },
                            { collection: 'team' },
                          ),
                        ]
                      : []),
                    { addMemberCallState: successCallState(member) },
                  );
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.teamMemberAdded(
                      successFeedback($localize`:@@org.teams.toast.memberAdded:Member added`),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { addMemberCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.mutationFailed(
                      toStoreFailureEventPayload(storeError, MUTATION_FAILURE_FALLBACK),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
      /**
       * Removes a member from the selected team and decrements its
       * `memberCount` locally.
       */
      removeMember: rxMethod<{ organizationId: string; teamId: string; memberId: string }>(
        pipe(
          tap(() => patchState(store, { removeMemberCallState: pendingCallState() })),
          exhaustMap(({ organizationId, teamId, memberId }) =>
            teamService.removeMember(organizationId, teamId, memberId).pipe(
              tapResponse({
                next: () => {
                  const team = store.teamEntityMap()[teamId];
                  patchState(
                    store,
                    removeEntity(memberId, { collection: 'teamMember' }),
                    ...(team
                      ? [
                          updateEntity(
                            {
                              id: teamId,
                              changes: { memberCount: Math.max(0, team.memberCount - 1) },
                            },
                            { collection: 'team' },
                          ),
                        ]
                      : []),
                    { removeMemberCallState: successCallState(null) },
                  );
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.teamMemberRemoved(
                      successFeedback($localize`:@@org.teams.toast.memberRemoved:Member removed`),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { removeMemberCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationTeamsStoreEvents.mutationFailed(
                      toStoreFailureEventPayload(storeError, MUTATION_FAILURE_FALLBACK),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);

/**
 * Injectable instance type exposed by {@link OrganizationTeamsStore}.
 */
export type OrganizationTeamsStore = InstanceType<typeof OrganizationTeamsStore>;
