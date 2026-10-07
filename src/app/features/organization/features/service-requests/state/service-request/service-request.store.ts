import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, pipe, switchMap, type Observable } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { ServiceRequestService } from '@features/organization/features/service-requests/data-access';
import type {
  ServiceRequestOutput,
  ServiceRequestStatus,
  CreateServiceRequestInput,
  UpdateServiceRequestInput,
  QualifyServiceRequestInput,
  DecisionServiceRequestInput,
  ConvertServiceRequestInput,
} from '@features/organization/features/service-requests/models';
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
  withComputed((store) => ({
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 30))),
    conversionUncertain: computed(
      () =>
        !!store.conversionCommand() &&
        store.writeCallState().status === 'error' &&
        !!store.writeCallState().error?.retryable,
    ),
  })),
  withMethods((store, service = inject(ServiceRequestService), dispatcher = inject(Dispatcher)) => {
    const dispatchCommand = (command: ServiceRequestCommand): Observable<ServiceRequestOutput> => {
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
    return {
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
                  store.writeCallState().status === 'pending'
                    ? store.writeCallState()
                    : sameOrganization
                      ? store.writeCallState()
                      : idleCallState(),
              },
            );
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
                  next: (collection) =>
                    patchState(
                      store,
                      setAllEntities([...collection.member], { collection: 'request' }),
                      { total: collection.totalItems, listCallState: successCallState(null) },
                    ),
                  error: (error: unknown) =>
                    patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
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
                store.writeCallState().status === 'pending'
                  ? store.writeCallState()
                  : sameTarget
                    ? store.writeCallState()
                    : idleCallState(),
            });
            return service.get(target.organizationId, target.requestId).pipe(
              tapResponse({
                next: (request) => patchState(store, { readCallState: successCallState(request) }),
                error: (error: unknown) =>
                  patchState(store, {
                    readCallState: errorCallState(toStoreError(error), store.readCallState().data),
                  }),
              }),
            );
          }),
        ),
      ),
      write: rxMethod<ServiceRequestCommand>(
        pipe(
          exhaustMap((incoming) => {
            const retained = store.conversionCommand();
            const command =
              incoming.kind === 'convert' &&
              store.conversionUncertain() &&
              retained?.organizationId === incoming.organizationId &&
              retained.request.id === incoming.request.id
                ? retained
                : ({ ...incoming, input: { ...incoming.input } } as ServiceRequestCommand);
            patchState(store, {
              organizationId: store.organizationId() || command.organizationId,
              writeCallState: pendingCallState(),
              ...(command.kind === 'convert' ? { conversionCommand: command } : {}),
            });
            return dispatchCommand(command).pipe(
              tapResponse({
                next: (request) => {
                  if (
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
                    store.organizationId() !== command.organizationId ||
                    (command.kind !== 'create' &&
                      store.selectedId() !== null &&
                      store.selectedId() !== command.request.id)
                  ) {
                    patchState(store, { writeCallState: idleCallState() });
                    return;
                  }
                  patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
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
    };
  }),
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
