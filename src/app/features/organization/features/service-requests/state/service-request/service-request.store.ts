import { computed, effect, inject, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, from, pipe, shareReplay, switchMap, type Observable } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import {
  ServiceRequestCommandRepository,
  ServiceRequestService,
} from '@features/organization/features/service-requests/data-access';
import type {
  ServiceRequestOutput,
  ServiceRequestStatus,
  CreateServiceRequestInput,
  UpdateServiceRequestInput,
  QualifyServiceRequestInput,
  DecisionServiceRequestInput,
  ConvertServiceRequestInput,
  ServiceRequestConversionCommand,
} from '@features/organization/features/service-requests/models';
import {
  ServiceRequestConversionService,
  ServiceRequestPersistenceError,
} from '@features/organization/features/service-requests/services';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports/organization-member-access';
import { serviceRequestStoreEvents } from './events/events';

/**
 * Interface ServiceRequestQuery
 * @interface
 *
 * @description
 * Authorized server collection query; equipment and site remain distinct scopes.
 *
 * @since unreleased
 */
export interface ServiceRequestQuery {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server page, starting at one.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly page?: number;
  /**
   * Property search
   * @readonly
   *
   * @description
   * Committed server search term.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly search?: string;
  /**
   * Property status
   * @readonly
   *
   * @description
   * Server workflow state or the selected workflow filter.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestStatus}
   */
  readonly status?: ServiceRequestStatus;
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Published equipment target or its explicit search scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly equipmentId?: string;
  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Root-site target or scope; qualification choices stay inside this site.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly siteId?: string;
}
/**
 * Type ServiceRequestCommand
 *
 * @description
 * Explicit accepted request mutation; only conversion carries an idempotent work-link identity.
 *
 * @since unreleased
 *
 * @type {ServiceRequestCommand}
 */
export type ServiceRequestCommand =
  | {
      readonly kind: 'create';
      readonly organizationId: string;
      readonly input: CreateServiceRequestInput;
    }
  | {
      readonly kind: 'update';
      readonly organizationId: string;
      readonly request: ServiceRequestOutput;
      readonly input: UpdateServiceRequestInput;
    }
  | {
      readonly kind: 'qualify';
      readonly organizationId: string;
      readonly request: ServiceRequestOutput;
      readonly input: QualifyServiceRequestInput;
    }
  | {
      readonly kind: 'reject' | 'cancel';
      readonly organizationId: string;
      readonly request: ServiceRequestOutput;
      readonly input: DecisionServiceRequestInput;
    }
  | {
      readonly kind: 'convert';
      readonly organizationId: string;
      readonly request: ServiceRequestOutput;
      readonly input: ConvertServiceRequestInput;
    };
/**
 * Type ConversionCommand
 *
 * @description
 * Captured conversion whose original revision and input survive an uncertain response.
 *
 * @since unreleased
 *
 * @type {ConversionCommand}
 */
type ConversionCommand = Extract<ServiceRequestCommand, { readonly kind: 'convert' }>;
/**
 * Interface ServiceRequestState
 * @interface
 *
 * @description
 * Request collection, selected detail and accepted mutation states within one component lifetime.
 *
 * @since unreleased
 */
interface ServiceRequestState {
  /**
   * Property commandContext
   * @readonly
   *
   * @description
   * Account, session, organization and permissions captured by the completed journal restoration.
   *
   * @type {string | null}
   */
  readonly commandContext: string | null;
  /**
   * Property commandCallState
   * @readonly
   *
   * @description
   * Durable conversion restoration must finish before another command can be accepted.
   *
   * @type {CallState<readonly ServiceRequestConversionCommand[]>}
   */
  readonly commandCallState: CallState<readonly ServiceRequestConversionCommand[]>;
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property query
   * @readonly
   *
   * @description
   * Current authorized collection scope and pagination.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestQuery | null}
   */
  readonly query: ServiceRequestQuery | null;
  /**
   * Property selectedId
   * @readonly
   *
   * @description
   * Request whose detail data may be retained during a same-target refresh.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly selectedId: string | null;
  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Collection request state; an unavailable read never implies an empty collection.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;
  /**
   * Property readCallState
   * @readonly
   *
   * @description
   * Selected request read state with same-target data retained on recoverable errors.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<ServiceRequestOutput>}
   */
  readonly readCallState: CallState<ServiceRequestOutput>;
  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Accepted mutation state, independent of cancellable reads.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<ServiceRequestOutput>}
   */
  readonly writeCallState: CallState<ServiceRequestOutput>;
  /**
   * Property conversionCommand
   * @readonly
   *
   * @description
   * Exact accepted conversion retained for an uncertain-response replay.
   *
   * @access public
   * @since unreleased
   *
   * @type {ConversionCommand | null}
   */
  readonly conversionCommand: ConversionCommand | null;
  /**
   * Property total
   * @readonly
   *
   * @description
   * Authoritative count returned by the server for the current scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly total: number;
}
/**
 * Constant initialState
 *
 * @description
 * Idle request state never claims that the server confirmed an empty collection.
 *
 * @since unreleased
 */
const initialState: ServiceRequestState = {
  commandContext: null,
  commandCallState: idleCallState(),
  organizationId: '',
  query: null,
  selectedId: null,
  total: 0,
  listCallState: idleCallState(),
  readCallState: idleCallState(),
  writeCallState: idleCallState(),
  conversionCommand: null,
};
/**
 * Constant ServiceRequestStore
 *
 * @description
 * Request workflow with cancellable scoped reads, non-cancellable accepted writes and exact
 * conversion replay.
 *
 * @since unreleased
 */
export const ServiceRequestStore = signalStore(
  withEntities({ entity: type<ServiceRequestOutput>(), collection: 'request' }),
  withState<ServiceRequestState>(initialState),
  withComputed(
    (
      store,
      member = inject(ORGANIZATION_MEMBER_ACCESS_PORT),
      session = inject(AUTH_SESSION_PORT),
    ) => ({
      pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 30))),
      commandsReady: computed(() => {
        const profile = member.profile();
        return (
          store.commandCallState().status === 'success' &&
          session.isAuthenticated() &&
          !!profile?.isActive &&
          profile.organizationId === store.organizationId() &&
          store.commandContext() ===
            JSON.stringify([
              profile.userId,
              store.organizationId(),
              session.sessionRevision(),
              member.permissions(),
            ])
        );
      }),
      conversionUncertain: computed(
        () => !!store.conversionCommand() && store.writeCallState().status !== 'pending',
      ),
    }),
  ),
  withMethods(
    (
      store,
      service = inject(ServiceRequestService),
      dispatcher = inject(Dispatcher),
      journal = inject(ServiceRequestCommandRepository),
      conversion = inject(ServiceRequestConversionService),
      member = inject(ORGANIZATION_MEMBER_ACCESS_PORT),
      session = inject(AUTH_SESSION_PORT),
    ) => {
      const actor = (organizationId: string, permission: string) => {
        const profile = member.profile();
        return journal.browser &&
          session.isAuthenticated() &&
          profile?.isActive &&
          profile.organizationId === organizationId &&
          member.permissions().includes(permission)
          ? { userId: profile.userId, revision: session.sessionRevision() }
          : null;
      };
      const current = (organizationId: string, userId: string, revision: number): boolean => {
        const profile = member.profile();
        return (
          session.isAuthenticated() &&
          session.sessionRevision() === revision &&
          !!profile?.isActive &&
          profile.userId === userId &&
          profile.organizationId === organizationId
        );
      };
      const dispatchCommand = (
        command: ServiceRequestCommand,
      ): Observable<ServiceRequestOutput> => {
        if (command.kind === 'create') return service.create(command.organizationId, command.input);
        switch (command.kind) {
          case 'update':
            return service.update(command.organizationId, command.request, command.input);
          case 'qualify':
            return service.qualify(command.organizationId, command.request, command.input);
          case 'reject':
            return service.reject(command.organizationId, command.request, command.input);
          case 'cancel':
            return service.cancel(command.organizationId, command.request, command.input);
          case 'convert':
            return service.convert(command.organizationId, command.request, command.input);
        }
      };
      const restoreCommands = rxMethod<void>(
        pipe(
          switchMap(() => {
            const organizationId = store.organizationId();
            const selectedId = store.selectedId();
            const profile = member.profile();
            const userId = profile?.userId ?? '';
            const revision = session.sessionRevision();
            const commandContext = JSON.stringify([
              userId,
              organizationId,
              revision,
              member.permissions(),
            ]);
            if (
              !journal.browser ||
              !organizationId ||
              !profile ||
              !current(organizationId, userId, revision)
            ) {
              patchState(store, { commandCallState: idleCallState(), conversionCommand: null });
              return EMPTY;
            }
            patchState(store, { commandCallState: pendingCallState() });
            return from(journal.readPending(userId, organizationId)).pipe(
              tapResponse({
                next: (commands) => {
                  if (
                    !current(organizationId, userId, revision) ||
                    store.organizationId() !== organizationId ||
                    store.selectedId() !== selectedId
                  )
                    return;
                  const retained = commands.find((command) => command.request.id === selectedId);
                  const active = store.writeCallState().status === 'pending';
                  patchState(store, {
                    commandContext,
                    commandCallState: successCallState(commands),
                    ...(active
                      ? {}
                      : {
                          conversionCommand: retained
                            ? {
                                kind: retained.kind,
                                organizationId: retained.organizationId,
                                request: retained.request,
                                input: retained.input,
                              }
                            : null,
                        }),
                  });
                },
                error: (error: unknown) => {
                  if (
                    current(organizationId, userId, revision) &&
                    store.organizationId() === organizationId
                  )
                    patchState(store, { commandCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      return {
        restoreCommands,
        activateCommands(organizationId: string): void {
          if (store.organizationId() !== organizationId)
            patchState(store, {
              organizationId,
              selectedId: null,
              commandCallState: idleCallState(),
              conversionCommand: null,
            });
          restoreCommands();
        },
        load: rxMethod<ServiceRequestQuery | null>(
          pipe(
            switchMap((query) => {
              if (!query) {
                patchState(store, initialState, removeAllEntities({ collection: 'request' }), {
                  writeCallState:
                    store.writeCallState().status === 'pending'
                      ? store.writeCallState()
                      : idleCallState(),
                });
                return EMPTY;
              }
              const sameScope = JSON.stringify(store.query()) === JSON.stringify(query);
              const sameOrganization = store.organizationId() === query.organizationId;
              patchState(
                store,
                ...(sameOrganization
                  ? []
                  : [initialState, removeAllEntities({ collection: 'request' })]),
                {
                  organizationId: query.organizationId,
                  query,
                  total: sameScope ? store.total() : 0,
                  listCallState: pendingCallState(),
                  writeCallState:
                    store.writeCallState().status === 'pending' || sameOrganization
                      ? store.writeCallState()
                      : idleCallState(),
                },
              );
              if (!sameOrganization) restoreCommands();
              const identity = actor(
                query.organizationId,
                ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ,
              );
              if (!identity) {
                patchState(store, { listCallState: idleCallState() });
                return EMPTY;
              }
              return service
                .list(query.organizationId, {
                  page: query.page ?? 1,
                  itemsPerPage: 30,
                  search: query.search,
                  params: {
                    ...(query.status ? { status: query.status } : {}),
                    ...(query.equipmentId ? { equipmentId: query.equipmentId } : {}),
                    ...(query.siteId ? { siteId: query.siteId } : {}),
                  },
                })
                .pipe(
                  tapResponse({
                    next: (collection) => {
                      if (
                        !current(query.organizationId, identity.userId, identity.revision) ||
                        !member
                          .permissions()
                          .includes(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ) ||
                        store.organizationId() !== query.organizationId
                      )
                        return;
                      patchState(
                        store,
                        setAllEntities([...collection.member], { collection: 'request' }),
                        { total: collection.totalItems, listCallState: successCallState(null) },
                      );
                    },
                    error: (error: unknown) => {
                      if (
                        current(query.organizationId, identity.userId, identity.revision) &&
                        store.organizationId() === query.organizationId
                      )
                        patchState(store, { listCallState: errorCallState(toStoreError(error)) });
                    },
                  }),
                );
            }),
          ),
        ),
        read: rxMethod<{ readonly organizationId: string; readonly requestId: string } | null>(
          pipe(
            switchMap((target) => {
              if (!target) {
                patchState(store, { selectedId: null, readCallState: idleCallState() });
                return EMPTY;
              }
              const sameTarget =
                store.organizationId() === target.organizationId &&
                store.selectedId() === target.requestId;
              patchState(store, {
                organizationId: target.organizationId,
                selectedId: target.requestId,
                readCallState: pendingCallState(sameTarget ? store.readCallState().data : null),
                writeCallState:
                  store.writeCallState().status === 'pending' || sameTarget
                    ? store.writeCallState()
                    : idleCallState(),
              });
              if (!sameTarget) restoreCommands();
              const identity = actor(
                target.organizationId,
                ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ,
              );
              if (!identity) {
                patchState(store, { readCallState: idleCallState() });
                return EMPTY;
              }
              return service.get(target.organizationId, target.requestId).pipe(
                tapResponse({
                  next: (request) => {
                    if (
                      current(target.organizationId, identity.userId, identity.revision) &&
                      member.permissions().includes(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ)
                    )
                      patchState(store, { readCallState: successCallState(request) });
                  },
                  error: (error: unknown) => {
                    if (!current(target.organizationId, identity.userId, identity.revision)) return;
                    patchState(store, {
                      readCallState: errorCallState(
                        toStoreError(error),
                        store.readCallState().data,
                      ),
                    });
                  },
                }),
              );
            }),
          ),
        ),
        write: rxMethod<ServiceRequestCommand>(
          pipe(
            exhaustMap((incoming) => {
              const retained = store.conversionCommand();
              const identity = actor(
                incoming.organizationId,
                incoming.kind === 'create'
                  ? ORGANIZATION_PERMISSION.SERVICE_REQUESTS_CREATE
                  : ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE,
              );
              if (
                !identity ||
                !store.commandsReady() ||
                store.organizationId() !== incoming.organizationId ||
                (retained && incoming.kind !== 'convert')
              )
                return EMPTY;
              const replay =
                incoming.kind === 'convert' &&
                retained?.organizationId === incoming.organizationId &&
                retained.request.id === incoming.request.id;
              if (
                incoming.kind === 'convert' &&
                !replay &&
                !member.permissions().includes(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN)
              )
                return EMPTY;
              const command = replay && retained ? retained : structuredClone(incoming);
              patchState(store, {
                organizationId: store.organizationId() || command.organizationId,
                writeCallState: pendingCallState(),
                ...(command.kind === 'convert' ? { conversionCommand: command } : {}),
              });
              const accepted =
                command.kind === 'convert'
                  ? conversion.execute({ ...command, userId: identity.userId }, identity.revision)
                  : dispatchCommand(command).pipe(shareReplay({ bufferSize: 1, refCount: false }));
              return accepted.pipe(
                tapResponse({
                  next: (request) => {
                    if (
                      !current(command.organizationId, identity.userId, identity.revision) ||
                      store.organizationId() !== command.organizationId ||
                      (command.kind !== 'create' &&
                        store.selectedId() !== null &&
                        store.selectedId() !== command.request.id)
                    ) {
                      patchState(store, { writeCallState: idleCallState() });
                      return;
                    }
                    patchState(store, {
                      writeCallState: successCallState(request),
                      ...(store.selectedId() === request.id
                        ? { readCallState: successCallState(request) }
                        : {}),
                      ...(command.kind === 'convert' ? { conversionCommand: null } : {}),
                    });
                    dispatcher.dispatch(
                      serviceRequestStoreEvents.saved({
                        organizationId: command.organizationId,
                        request,
                        kind: command.kind,
                      }),
                    );
                  },
                  error: (error: unknown) => {
                    if (
                      !current(command.organizationId, identity.userId, identity.revision) ||
                      store.organizationId() !== command.organizationId ||
                      (command.kind !== 'create' &&
                        store.selectedId() !== null &&
                        store.selectedId() !== command.request.id)
                    ) {
                      patchState(store, { writeCallState: idleCallState() });
                      return;
                    }
                    const failure = toStoreError(error);
                    const code: number = Number(failure.code);
                    const rejected = code >= 400 && code < 500 && !failure.retryable;
                    patchState(store, {
                      writeCallState: errorCallState(failure),
                      ...(command.kind === 'convert' &&
                      (rejected || (error instanceof ServiceRequestPersistenceError && !replay))
                        ? { conversionCommand: null }
                        : {}),
                    });
                  },
                }),
              );
            }),
          ),
        ),
        clearWrite(): void {
          if (store.writeCallState().status === 'pending' || store.conversionUncertain()) return;
          patchState(store, { writeCallState: idleCallState(), conversionCommand: null });
        },
        clearSession(): void {
          patchState(
            store,
            {
              commandContext: null,
              readCallState: idleCallState(),
              listCallState: idleCallState(),
              writeCallState: idleCallState(),
              commandCallState: idleCallState(),
              conversionCommand: null,
              total: 0,
            },
            removeAllEntities({ collection: 'request' }),
          );
        },
      };
    },
  ),
  withHooks(
    (
      store,
      member = inject(ORGANIZATION_MEMBER_ACCESS_PORT),
      session = inject(AUTH_SESSION_PORT),
    ) => ({
      onInit(): void {
        let previousRevision = session.sessionRevision();
        let previousUserId = member.profile()?.userId ?? null;
        effect(() => {
          const organizationId = store.organizationId();
          store.selectedId();
          const profile = member.profile();
          const revision = session.sessionRevision();
          const authenticated = session.isAuthenticated();
          member.permissions();
          const replaced =
            previousRevision !== revision ||
            (previousUserId !== null && profile?.userId !== previousUserId);
          previousRevision = revision;
          if (profile) previousUserId = profile.userId;
          untracked(() => {
            if (
              replaced ||
              !authenticated ||
              (organizationId && profile?.organizationId !== organizationId)
            )
              store.clearSession();
            store.restoreCommands();
          });
        });
      },
    }),
  ),
);
/**
 * Type ServiceRequestStoreType
 *
 * @description
 * Store instance contract consumed by owning pages and tests.
 *
 * @since unreleased
 *
 * @type {ServiceRequestStoreType}
 */
export type ServiceRequestStoreType = InstanceType<typeof ServiceRequestStore>;
