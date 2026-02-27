import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  removeAllEntities,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, Observable, pipe, switchMap, tap } from 'rxjs';
import {
  OrganizationService,
  OrganizationMemberService,
  OrganizationRoleService,
  OrganizationLegalProfileService,
  OrganizationInvitationService,
} from '@core/services/api/organization';
import type { RequestOptions } from '@core/services/api';
import type { HydraCollection } from '@core/models/api';
import type {
  OrganizationOutput,
  CreateOrganizationInput,
  OrganizationMemberOutput,
  AddOrganizationMemberInput,
  OrganizationRoleOutput,
  CreateOrganizationRoleInput,
  AssignOrganizationRoleInput,
  OrganizationInvitationOutput,
  InviteOrganizationMemberInput,
  OrganizationLegalProfileOutput,
  UpsertOrganizationLegalProfileInput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import type { OrganizationState } from './organization-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type CollectionOperation,
  type Operation,
  type OperationError,
} from '../operations';
import { organizationStoreEvents } from './organization.events';

//#region Initial State
/**
 * Constant INITIAL_ORGANIZATION_STATE
 *
 * @description
 * Initial state for the organization store.
 * All operations start in idle state.
 *
 * @since 1.0.0
 *
 * @type {OrganizationState}
 */
const INITIAL_ORGANIZATION_STATE: OrganizationState = {
  totalOrganizations: 0,
  selectedOrganization: null,
  listOperation: createIdleOperation(),
  getOperation: createIdleOperation(),
  createOperation: createIdleOperation(),

  totalMembers: 0,
  membersListOperation: createIdleOperation(),
  addMemberOperation: createIdleOperation(),

  totalRoles: 0,
  rolesListOperation: createIdleOperation(),
  createRoleOperation: createIdleOperation(),

  totalInvitations: 0,
  invitationsListOperation: createIdleOperation(),
  inviteOperation: createIdleOperation(),
  revokeInvitationOperation: createIdleOperation(),

  legalProfile: null,
  legalProfileOperation: createIdleOperation(),
  upsertLegalProfileOperation: createIdleOperation(),

  statistics: null,
  statisticsOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store OrganizationStore
 * @const OrganizationStore
 *
 * @description
 * NGRX SignalStore for organization management.
 * Handles organizations, members, roles, invitations, and legal profiles.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const orgStore = inject(OrganizationStore);
 *
 * // Load organizations
 * orgStore.loadOrganizations();
 *
 * // Load a single organization
 * orgStore.loadOrganization('org-id');
 *
 * // Create an organization
 * orgStore.create({ name: 'My Org' });
 * ```
 */
export const OrganizationStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<OrganizationState>(INITIAL_ORGANIZATION_STATE),
  //#endregion

  //#region Entities
  withEntities({ entity: type<OrganizationOutput>(), collection: 'organization' }),
  withEntities({ entity: type<OrganizationMemberOutput>(), collection: 'member' }),
  withEntities({ entity: type<OrganizationRoleOutput>(), collection: 'role' }),
  withEntities({ entity: type<OrganizationInvitationOutput>(), collection: 'invitation' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    // ── Entity Aliases ─────────────────────────────────────────────────────────

    /** Alias for organizationEntities — backward-compatible accessor. */
    organizations: computed<ReadonlyArray<OrganizationOutput>>(
      () => store.organizationEntities(),
    ),

    /** Alias for memberEntities — backward-compatible accessor. */
    members: computed<ReadonlyArray<OrganizationMemberOutput>>(
      () => store.memberEntities(),
    ),

    /** Alias for roleEntities — backward-compatible accessor. */
    roles: computed<ReadonlyArray<OrganizationRoleOutput>>(
      () => store.roleEntities(),
    ),

    /** Alias for invitationEntities — backward-compatible accessor. */
    invitations: computed<ReadonlyArray<OrganizationInvitationOutput>>(
      () => store.invitationEntities(),
    ),

    // ── Organizations ──────────────────────────────────────────────────────────

    /** True while the organization list is loading. */
    isLoadingOrganizations: computed<boolean>(
      () => store.listOperation().status === 'loading',
    ),

    /** True while a single organization is being fetched. */
    isLoadingOrganization: computed<boolean>(
      () => store.getOperation().status === 'loading',
    ),

    /** True while an organization is being created. */
    isCreating: computed<boolean>(
      () => store.createOperation().status === 'loading',
    ),

    /** Error from the list operation, if any. */
    listError: computed<OperationError<unknown> | null>(() => {
      const op: CollectionOperation<OrganizationOutput, unknown> = store.listOperation();
      return op.status === 'error' ? op.error : null;
    }),

    /** Error from the get operation, if any. */
    getError: computed<OperationError<unknown> | null>(() => {
      const op: Operation<OrganizationOutput | null, unknown> = store.getOperation();
      return op.status === 'error' ? op.error : null;
    }),

    /** Error from the create operation, if any. */
    createError: computed<OperationError<unknown> | null>(() => {
      const op: Operation<OrganizationOutput | null, unknown> = store.createOperation();
      return op.status === 'error' ? op.error : null;
    }),

    // ── Members ────────────────────────────────────────────────────────────────

    /** True while the members list is loading. */
    isLoadingMembers: computed<boolean>(
      () => store.membersListOperation().status === 'loading',
    ),

    /** True while a member is being added. */
    isAddingMember: computed<boolean>(
      () => store.addMemberOperation().status === 'loading',
    ),

    /** Error from the members list operation, if any. */
    membersListError: computed<OperationError<unknown> | null>(() => {
      const op: CollectionOperation<OrganizationMemberOutput, unknown> =
        store.membersListOperation();
      return op.status === 'error' ? op.error : null;
    }),

    /** Error from the add member operation, if any. */
    addMemberError: computed<OperationError<unknown> | null>(() => {
      const op: Operation<OrganizationMemberOutput | null, unknown> = store.addMemberOperation();
      return op.status === 'error' ? op.error : null;
    }),

    // ── Roles ─────────────────────────────────────────────────────────────────

    /** True while the roles list is loading. */
    isLoadingRoles: computed<boolean>(
      () => store.rolesListOperation().status === 'loading',
    ),

    /** True while a role is being created. */
    isCreatingRole: computed<boolean>(
      () => store.createRoleOperation().status === 'loading',
    ),

    /** Error from the roles list operation, if any. */
    rolesListError: computed<OperationError<unknown> | null>(() => {
      const op: CollectionOperation<OrganizationRoleOutput, unknown> = store.rolesListOperation();
      return op.status === 'error' ? op.error : null;
    }),

    // ── Invitations ────────────────────────────────────────────────────────────

    /** True while the invitations list is loading. */
    isLoadingInvitations: computed<boolean>(
      () => store.invitationsListOperation().status === 'loading',
    ),

    /** True while an invitation is being sent. */
    isInviting: computed<boolean>(
      () => store.inviteOperation().status === 'loading',
    ),

    /** True while an invitation is being revoked. */
    isRevokingInvitation: computed<boolean>(
      () => store.revokeInvitationOperation().status === 'loading',
    ),

    /** Pending invitations only. */
    pendingInvitations: computed<ReadonlyArray<OrganizationInvitationOutput>>(() =>
      store.invitationEntities().filter((i) => i.status === 'pending'),
    ),

    // ── Legal Profile ──────────────────────────────────────────────────────────

    /** True while the legal profile is loading. */
    isLoadingLegalProfile: computed<boolean>(
      () => store.legalProfileOperation().status === 'loading',
    ),

    /** True while the legal profile is being saved. */
    isUpsertingLegalProfile: computed<boolean>(
      () => store.upsertLegalProfileOperation().status === 'loading',
    ),

    /** Error from the legal profile load operation, if any. */
    legalProfileError: computed<OperationError<unknown> | null>(() => {
      const op: Operation<OrganizationLegalProfileOutput | null, unknown> =
        store.legalProfileOperation();
      return op.status === 'error' ? op.error : null;
    }),

    // ── Statistics ──────────────────────────────────────────────────────────

    /** True while the organization statistics are loading. */
    isLoadingStatistics: computed<boolean>(
      () => store.statisticsOperation().status === 'loading',
    ),

    /** Error from the statistics operation, if any. */
    statisticsError: computed<OperationError<unknown> | null>(() => {
      const op: Operation<OrganizationStatisticsOutput | null, unknown> =
        store.statisticsOperation();
      return op.status === 'error' ? op.error : null;
    }),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
    memberService: OrganizationMemberService = inject<OrganizationMemberService>(OrganizationMemberService),
    roleService: OrganizationRoleService = inject<OrganizationRoleService>(OrganizationRoleService),
    invitationService: OrganizationInvitationService = inject<OrganizationInvitationService>(OrganizationInvitationService),
    legalProfileService: OrganizationLegalProfileService = inject<OrganizationLegalProfileService>(OrganizationLegalProfileService),
  ) => ({
    /**
     * Method loadOrganizations
     *
     * @description
     * Loads the paginated list of organizations for the authenticated user.
     *
     * @since 1.0.0
     *
     * @param {RequestOptions} [options] - Optional pagination / filter options.
     */
    loadOrganizations: rxMethod<RequestOptions | void>(
      pipe(
        tap(() => {
          patchState(store, {
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap((options) =>
          organizationService.list(options ?? undefined).pipe(
            tapResponse({
              next: (response: HydraCollection<OrganizationOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'organization' }),
                  {
                    totalOrganizations: response.totalItems,
                    listOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  listOperation: createErrorOperation(
                    operationError,
                    store.listOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load organizations'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method loadOrganization
     *
     * @description
     * Loads a single organization by ID.
     *
     * @since 1.0.0
     *
     * @param {string} id - Organization identifier.
     */
    loadOrganization: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, {
            getOperation: createLoadingOperation(store.getOperation().data),
          });
        }),
        switchMap((id) =>
          organizationService.get(id).pipe(
            tapResponse({
              next: (organization: OrganizationOutput) => {
                patchState(store, {
                  selectedOrganization: organization,
                  getOperation: createSuccessOperation(organization),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  getOperation: createErrorOperation(
                    operationError,
                    store.getOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.getFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load organization'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method setOrganization
     *
     * @description
     * Directly sets the selected organization (e.g., resolved from route data).
     *
     * @since 1.0.0
     *
     * @param {OrganizationOutput} organization - Organization to set as selected.
     */
    setOrganization(organization: OrganizationOutput): void {
      patchState(store, {
        selectedOrganization: organization,
        getOperation: createSuccessOperation(organization),
      });
    },

    /**
     * Method resolveOrganization
     *
     * @description
     * Fetches a single organization by ID, updates the store state
     * (getOperation + selectedOrganization) and returns the Observable
     * so callers such as route resolvers can await the result.
     *
     * Unlike {@link loadOrganization}, this method returns an Observable
     * that emits the resolved organization and completes, making it
     * suitable for use in Angular route resolvers.
     *
     * @since 2.0.0
     *
     * @param {string} id - Organization identifier.
     * @returns {Observable<OrganizationOutput>}
     */
    resolveOrganization(id: string): Observable<OrganizationOutput> {
      patchState(store, {
        getOperation: createLoadingOperation(store.getOperation().data),
      });

      return organizationService.get(id).pipe(
        tap({
          next: (organization: OrganizationOutput) => {
            patchState(store, {
              selectedOrganization: organization,
              getOperation: createSuccessOperation(organization),
            });
          },
          error: (error: unknown) => {
            const operationError: OperationError<unknown> =
              createOperationErrorFromUnknown(error);
            patchState(store, {
              getOperation: createErrorOperation(
                operationError,
                store.getOperation().data,
              ),
            });
            dispatcher.dispatch(
              organizationStoreEvents.getFailed(
                toOperationFailureEventPayload(operationError, 'Failed to load organization'),
              ),
            );
          },
        }),
      );
    },

    /**
     * Method create
     *
     * @description
     * Creates a new organization and adds it to the list.
     *
     * @since 1.0.0
     *
     * @param {CreateOrganizationInput} input - Organization creation payload.
     */
    create: rxMethod<CreateOrganizationInput>(
      pipe(
        tap(() => {
          patchState(store, {
            createOperation: createLoadingOperation(store.createOperation().data),
          });
        }),
        exhaustMap((input) =>
          organizationService.create(input).pipe(
            tapResponse({
              next: (organization: OrganizationOutput) => {
                patchState(store,
                  addEntity(organization, { collection: 'organization' }),
                  {
                    totalOrganizations: store.totalOrganizations() + 1,
                    createOperation: createSuccessOperation(organization),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  createOperation: createErrorOperation(
                    operationError,
                    store.createOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.createFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to create organization'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Members ────────────────────────────────────────────────────────────────

    /**
     * Method loadMembers
     *
     * @description
     * Loads the members of an organization.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; options?: RequestOptions }} params
     */
    loadMembers: rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            membersListOperation: createLoadingOperation(store.membersListOperation().data),
          });
        }),
        switchMap(({ organizationId, options }) =>
          memberService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<OrganizationMemberOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'member' }),
                  {
                    totalMembers: response.totalItems,
                    membersListOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  membersListOperation: createErrorOperation(
                    operationError,
                    store.membersListOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.membersListFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load members'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method addMember
     *
     * @description
     * Adds a user as a member of an organization.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; input: AddOrganizationMemberInput }} params
     */
    addMember: rxMethod<{ organizationId: string; input: AddOrganizationMemberInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            addMemberOperation: createLoadingOperation(store.addMemberOperation().data),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          memberService.add(organizationId, input).pipe(
            tapResponse({
              next: (member: OrganizationMemberOutput) => {
                patchState(store,
                  addEntity(member, { collection: 'member' }),
                  {
                    totalMembers: store.totalMembers() + 1,
                    addMemberOperation: createSuccessOperation(member),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  addMemberOperation: createErrorOperation(
                    operationError,
                    store.addMemberOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.addMemberFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to add member'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Roles ─────────────────────────────────────────────────────────────────

    /**
     * Method loadRoles
     *
     * @description
     * Loads the roles of an organization.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; options?: RequestOptions }} params
     */
    loadRoles: rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            rolesListOperation: createLoadingOperation(store.rolesListOperation().data),
          });
        }),
        switchMap(({ organizationId, options }) =>
          roleService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<OrganizationRoleOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'role' }),
                  {
                    totalRoles: response.totalItems,
                    rolesListOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  rolesListOperation: createErrorOperation(
                    operationError,
                    store.rolesListOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.rolesListFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load roles'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method createRole
     *
     * @description
     * Creates a new custom role inside an organization.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; input: CreateOrganizationRoleInput }} params
     */
    createRole: rxMethod<{ organizationId: string; input: CreateOrganizationRoleInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            createRoleOperation: createLoadingOperation(store.createRoleOperation().data),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          roleService.create(organizationId, input).pipe(
            tapResponse({
              next: (role: OrganizationRoleOutput) => {
                patchState(store,
                  addEntity(role, { collection: 'role' }),
                  {
                    totalRoles: store.totalRoles() + 1,
                    createRoleOperation: createSuccessOperation(role),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  createRoleOperation: createErrorOperation(
                    operationError,
                    store.createRoleOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.createRoleFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to create role'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method assignRoleToMember
     *
     * @description
     * Assigns a role to an existing organization member.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; memberId: string; input: AssignOrganizationRoleInput }} params
     */
    assignRoleToMember: rxMethod<{
      organizationId: string;
      memberId: string;
      input: AssignOrganizationRoleInput;
    }>(
      pipe(
        exhaustMap(({ organizationId, memberId, input }) =>
          roleService.assignToMember(organizationId, memberId, input).pipe(
            tapResponse({
              next: (updatedMember: OrganizationMemberOutput) => {
                patchState(store,
                  setEntity(updatedMember, { collection: 'member' }),
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                dispatcher.dispatch(
                  organizationStoreEvents.addMemberFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to assign role'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Invitations ────────────────────────────────────────────────────────────

    /**
     * Method loadInvitations
     *
     * @description
     * Loads the invitation list for an organization.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; options?: RequestOptions }} params
     */
    loadInvitations: rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            invitationsListOperation: createLoadingOperation(
              store.invitationsListOperation().data,
            ),
          });
        }),
        switchMap(({ organizationId, options }) =>
          organizationService.listInvitations(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<OrganizationInvitationOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'invitation' }),
                  {
                    totalInvitations: response.totalItems,
                    invitationsListOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  invitationsListOperation: createErrorOperation(
                    operationError,
                    store.invitationsListOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.invitationsListFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load invitations',
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
     * Method invite
     *
     * @description
     * Sends an invitation to a user to join an organization.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; input: InviteOrganizationMemberInput }} params
     */
    invite: rxMethod<{ organizationId: string; input: InviteOrganizationMemberInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            inviteOperation: createLoadingOperation(store.inviteOperation().data),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          invitationService.invite(organizationId, input).pipe(
            tapResponse({
              next: (invitation: OrganizationInvitationOutput) => {
                patchState(store,
                  addEntity(invitation, { collection: 'invitation' }),
                  {
                    totalInvitations: store.totalInvitations() + 1,
                    inviteOperation: createSuccessOperation(invitation),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  inviteOperation: createErrorOperation(
                    operationError,
                    store.inviteOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.inviteFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to send invitation'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method revokeInvitation
     *
     * @description
     * Revokes a pending invitation.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; invitationId: string }} params
     */
    revokeInvitation: rxMethod<{ organizationId: string; invitationId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            revokeInvitationOperation: createLoadingOperation(
              store.revokeInvitationOperation().data,
            ),
          });
        }),
        exhaustMap(({ organizationId, invitationId }) =>
          organizationService.revokeInvitation(organizationId, invitationId).pipe(
            tapResponse({
              next: (updated: OrganizationInvitationOutput) => {
                patchState(store,
                  setEntity(updated, { collection: 'invitation' }),
                  {
                    revokeInvitationOperation: createSuccessOperation(updated),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  revokeInvitationOperation: createErrorOperation(
                    operationError,
                    store.revokeInvitationOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.revokeInvitationFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to revoke invitation',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Legal Profile ──────────────────────────────────────────────────────────

    /**
     * Method loadLegalProfile
     *
     * @description
     * Loads the legal profile of an organization.
     *
     * @since 1.0.0
     *
     * @param {string} organizationId - Organization identifier.
     */
    loadLegalProfile: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, {
            legalProfileOperation: createLoadingOperation(store.legalProfileOperation().data),
          });
        }),
        switchMap((organizationId) =>
          legalProfileService.get(organizationId).pipe(
            tapResponse({
              next: (profile: OrganizationLegalProfileOutput) => {
                patchState(store, {
                  legalProfile: profile,
                  legalProfileOperation: createSuccessOperation(profile),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  legalProfileOperation: createErrorOperation(
                    operationError,
                    store.legalProfileOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.legalProfileFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load legal profile',
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
     * Method upsertLegalProfile
     *
     * @description
     * Creates or updates the legal profile of an organization.
     *
     * @since 1.0.0
     *
     * @param {{ organizationId: string; input: UpsertOrganizationLegalProfileInput }} params
     */
    upsertLegalProfile: rxMethod<{
      organizationId: string;
      input: UpsertOrganizationLegalProfileInput;
    }>(
      pipe(
        tap(() => {
          patchState(store, {
            upsertLegalProfileOperation: createLoadingOperation(
              store.upsertLegalProfileOperation().data,
            ),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          legalProfileService.upsert(organizationId, input).pipe(
            tapResponse({
              next: (profile: OrganizationLegalProfileOutput) => {
                patchState(store, {
                  legalProfile: profile,
                  upsertLegalProfileOperation: createSuccessOperation(profile),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  upsertLegalProfileOperation: createErrorOperation(
                    operationError,
                    store.upsertLegalProfileOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.upsertLegalProfileFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to save legal profile',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Sync Helpers ───────────────────────────────────────────────────────────

    /**
     * Method clear
     *
     * @description
     * Resets the entire organization store to its initial state.
     * Should be called on logout.
     *
     * @since 1.0.0
     */
    clear(): void {
      patchState(store,
        removeAllEntities({ collection: 'organization' }),
        removeAllEntities({ collection: 'member' }),
        removeAllEntities({ collection: 'role' }),
        removeAllEntities({ collection: 'invitation' }),
        INITIAL_ORGANIZATION_STATE,
      );
    },

    /**
     * Method resetCreateOperation
     *
     * @description Resets the create operation to idle.
     * @since 1.0.0
     */
    resetCreateOperation(): void {
      patchState(store, { createOperation: createIdleOperation() });
    },

    /**
     * Method resetInviteOperation
     *
     * @description Resets the invite operation to idle.
     * @since 1.0.0
     */
    resetInviteOperation(): void {
      patchState(store, { inviteOperation: createIdleOperation() });
    },

    /**
     * Method resetAddMemberOperation
     *
     * @description Resets the add-member operation to idle.
     * @since 1.0.0
     */
    resetAddMemberOperation(): void {
      patchState(store, { addMemberOperation: createIdleOperation() });
    },

    /**
     * Method resetUpsertLegalProfileOperation
     *
     * @description Resets the upsert legal profile operation to idle.
     * @since 1.0.0
     */
    resetUpsertLegalProfileOperation(): void {
      patchState(store, { upsertLegalProfileOperation: createIdleOperation() });
    },

    // ── Statistics ──────────────────────────────────────────────────────────

    /**
     * Method loadStatistics
     *
     * @description
     * Loads the statistics for a given organization.
     *
     * @since 1.1.0
     *
     * @param {string} organizationId - Organization identifier.
     */
    loadStatistics: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, {
            statisticsOperation: createLoadingOperation(store.statisticsOperation().data),
          });
        }),
        switchMap((organizationId) =>
          organizationService.getStatistics(organizationId).pipe(
            tapResponse({
              next: (statistics: OrganizationStatisticsOutput) => {
                patchState(store, {
                  statistics,
                  statisticsOperation: createSuccessOperation(statistics),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  statisticsOperation: createErrorOperation(
                    operationError,
                    store.statisticsOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  organizationStoreEvents.statisticsFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load organization statistics',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type OrganizationStore
 * @type OrganizationStore
 *
 * @description
 * Type alias for the OrganizationStore instance.
 *
 * @since 1.0.0
 */
export type OrganizationStore = InstanceType<typeof OrganizationStore>;
