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
import { CustomerService } from '@features/organization/features/customers/data-access';
import type {
  CustomerInput,
  CustomerOutput,
} from '@features/organization/features/customers/models';
import { customerStoreEvents } from './events/events';

/**
 * Interface CustomerQuery
 * @interface
 *
 * @description
 * Server directory query with one explicit organization authority.
 *
 * @since unreleased
 */
export interface CustomerQuery {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization used as the authority for the request.
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
   * Requested server page, starting at one.
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
   * Server search term across the authorized customer directory.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly search?: string;
  /**
   * Property archived
   * @readonly
   *
   * @description
   * Whether the server query selects archived customers only.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly archived?: boolean;
}

/**
 * Type CustomerCommand
 *
 * @description
 * Accepted write; repeated clicks cannot cancel a command already in flight.
 *
 * @since unreleased
 *
 * @type
 */
export type CustomerCommand =
  | { readonly kind: 'create'; readonly organizationId: string; readonly input: CustomerInput }
  | {
      readonly kind: 'update';
      readonly organizationId: string;
      readonly customer: CustomerOutput;
      readonly input: CustomerInput;
    }
  | {
      readonly kind: 'archive' | 'restore';
      readonly organizationId: string;
      readonly customer: CustomerOutput;
    };

/**
 * Interface CustomerState
 * @interface
 *
 * @description
 * Directory, selected-record and command states belong to the component's lifetime.
 *
 * @since unreleased
 */
interface CustomerState {
  /**
   * Property query
   * @readonly
   *
   * @description
   * Current organization and committed directory query.
   *
   * @access public
   * @since unreleased
   *
   * @type {CustomerQuery | null}
   */
  readonly query: CustomerQuery | null;
  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Request state for the server-paginated directory.
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
   * Request state for the retained selected customer.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<CustomerOutput>}
   */
  readonly readCallState: CallState<CustomerOutput>;
  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Request state for the accepted customer mutation.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<CustomerOutput>}
   */
  readonly writeCallState: CallState<CustomerOutput>;
  /**
   * Property total
   * @readonly
   *
   * @description
   * Authoritative result count from the server.
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
 * Empty state never implies that the server directory was successfully read.
 *
 * @since unreleased
 */
const initialState: CustomerState = {
  query: null,
  listCallState: idleCallState(),
  readCallState: idleCallState(),
  writeCallState: idleCallState(),
  total: 0,
};

/**
 * Constant CustomerStore
 *
 * @description
 * Customer directory with cancellable scoped reads and non-cancellable accepted writes.
 *
 * @since unreleased
 */
export const CustomerStore = signalStore(
  withEntities({ entity: type<CustomerOutput>(), collection: 'customer' }),
  withState<CustomerState>(initialState),
  withComputed((store) => ({
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 20))),
  })),
  withMethods((store, service = inject(CustomerService)) => ({
    /**
     * @description
     * Queries one server page and cancels obsolete reads on scope changes.
     */
    load: rxMethod<CustomerQuery | null>(
      pipe(
        switchMap((query) => {
          if (!query) {
            patchState(store, initialState, removeAllEntities({ collection: 'customer' }), {
              writeCallState:
                store.writeCallState().status === 'pending'
                  ? store.writeCallState()
                  : idleCallState(),
            });
            return EMPTY;
          }
          const sameOrganization = store.query()?.organizationId === query.organizationId;
          patchState(
            store,
            ...(sameOrganization
              ? []
              : [initialState, removeAllEntities({ collection: 'customer' })]),
            {
              query,
              listCallState: pendingCallState(),
              writeCallState:
                store.writeCallState().status === 'pending' || sameOrganization
                  ? store.writeCallState()
                  : idleCallState(),
            },
          );
          return service
            .list(query.organizationId, {
              page: query.page ?? 1,
              itemsPerPage: 20,
              search: query.search,
              params: { archived: query.archived ?? false },
            })
            .pipe(
              tapResponse({
                next: (response) =>
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'customer' }),
                    {
                      total: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  ),
                error: (error: unknown) =>
                  patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
              }),
            );
        }),
      ),
    ),
    /**
     * @description
     * Hydrates a retained selection independently of directory pagination.
     */
    read: rxMethod<{ readonly organizationId: string; readonly customerId: string } | null>(
      pipe(
        switchMap((scope) => {
          patchState(store, { readCallState: scope ? pendingCallState() : idleCallState() });
          if (!scope) return EMPTY;
          return service.get(scope.organizationId, scope.customerId).pipe(
            tapResponse({
              next: (customer) => patchState(store, { readCallState: successCallState(customer) }),
              error: (error: unknown) =>
                patchState(store, { readCallState: errorCallState(toStoreError(error)) }),
            }),
          );
        }),
      ),
    ),
    /**
     * @description
     * Resets only stale command feedback when a new editor is opened.
     */
    clearWrite(): void {
      if (store.writeCallState().status !== 'pending')
        patchState(store, { writeCallState: idleCallState() });
    },
  })),
  withMethods((store, service = inject(CustomerService), dispatcher = inject(Dispatcher)) => ({
    /**
     * @description
     * Persists one accepted command and reports its immutable originating scope.
     */
    save: rxMethod<CustomerCommand>(
      pipe(
        exhaustMap((command) => {
          patchState(store, { writeCallState: pendingCallState() });
          let request: Observable<CustomerOutput>;
          if (command.kind === 'create')
            request = service.create(command.organizationId, command.input);
          else if (command.kind === 'update')
            request = service.update(command.organizationId, command.customer, command.input);
          else if (command.kind === 'archive')
            request = service.archive(command.organizationId, command.customer);
          else request = service.restore(command.organizationId, command.customer);
          return request.pipe(
            tapResponse({
              next: (customer) => {
                patchState(store, {
                  writeCallState:
                    store.query()?.organizationId === command.organizationId
                      ? successCallState(customer)
                      : idleCallState(),
                });
                dispatcher.dispatch(
                  customerStoreEvents.saved({
                    organizationId: command.organizationId,
                    customerId: customer.id,
                  }),
                );
              },
              error: (error: unknown) => {
                patchState(store, {
                  writeCallState:
                    store.query()?.organizationId === command.organizationId
                      ? errorCallState(toStoreError(error))
                      : idleCallState(),
                });
              },
            }),
          );
        }),
      ),
    ),
  })),
);

/**
 * Type CustomerStoreType
 *
 * @description
 * Public instance type for orchestrating consumers.
 *
 * @since unreleased
 *
 * @type
 */
export type CustomerStoreType = InstanceType<typeof CustomerStore>;
