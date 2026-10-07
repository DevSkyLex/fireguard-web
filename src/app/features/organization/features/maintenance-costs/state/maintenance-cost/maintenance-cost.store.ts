import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
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
import { EMPTY, exhaustMap, pipe, switchMap, type Observable } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  successFeedback,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import { MaintenanceCostService } from '@features/organization/features/maintenance-costs/data-access';
import type { MaintenanceRateOutput } from '@features/organization/features/maintenance-costs/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { toMemberSelectOption } from '@features/organization/utils';
import { maintenanceCostStoreEvents } from './events/events';
import type { MaintenanceCostCommand } from './models/maintenance-cost-command.type';
import type {
  MaintenanceCostMutation,
  MaintenanceCostScope,
  MaintenanceCostState,
} from './models/maintenance-cost-state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Empty private state, never handed to server rendering or a new session.
 */
const INITIAL_STATE: MaintenanceCostState = {
  scope: null,
  scopeVersion: 0,
  costCallState: idleCallState(),
  currencyCallState: idleCallState(),
  ratesCallState: idleCallState(),
  membersCallState: idleCallState(),
  writeCallState: idleCallState(),
  command: null,
  ratePage: 1,
  rateTotal: 0,
};

/**
 * Constant MaintenanceCostStore
 *
 * @description
 * Browser-only financial workspace. Scope changes cancel reads, clear private facts and discard
 * late replies without cancelling accepted writes.
 */
export const MaintenanceCostStore = signalStore(
  withEntities({ entity: type<MaintenanceRateOutput>(), collection: 'rate' }),
  withState<MaintenanceCostState>(INITIAL_STATE),
  withComputed((store) => ({
    writePending: computed(() => store.writeCallState().status === 'pending'),
    uncertainWrite: computed(
      () =>
        store.writeCallState().status === 'error' &&
        !!store.command() &&
        (store.writeCallState().error?.retryable === true ||
          store.writeCallState().error?.code === 0),
    ),
  })),
  withMethods(
    (
      store,
      api = inject(MaintenanceCostService),
      members = inject(OrganizationMemberService),
      permissions = inject(OrganizationPermissionService),
      session = inject(AUTH_SESSION_PORT),
      platform = inject(PLATFORM_ID),
      dispatcher = inject(Dispatcher),
    ) => {
      const readable = (): boolean =>
        isPlatformBrowser(platform) &&
        session.isAuthenticated() &&
        permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ);
      const current = (scope: MaintenanceCostScope, generation: number): boolean =>
        readable() &&
        generation === store.scopeVersion() &&
        session.sessionRevision() === scope.sessionRevision &&
        store.scope()?.organizationId === scope.organizationId &&
        store.scope()?.interventionId === scope.interventionId;
      const readCost = rxMethod<MaintenanceCostScope | null>(
        pipe(
          switchMap((scope) => {
            if (
              !scope?.interventionId ||
              !readable() ||
              scope.sessionRevision !== session.sessionRevision()
            ) {
              patchState(store, { costCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.scopeVersion();
            patchState(store, { costCallState: pendingCallState(store.costCallState().data) });
            return api.readCost(scope.organizationId, scope.interventionId).pipe(
              tapResponse({
                next: (cost) => {
                  if (
                    current(scope, generation) &&
                    cost.organizationId === scope.organizationId &&
                    cost.interventionId === scope.interventionId
                  )
                    patchState(store, { costCallState: successCallState(cost) });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, {
                      costCallState: errorCallState(
                        toStoreError(error),
                        store.costCallState().data,
                      ),
                    });
                },
              }),
            );
          }),
        ),
      );
      const readCurrency = rxMethod<MaintenanceCostScope | null>(
        pipe(
          switchMap((scope) => {
            if (!scope || !readable() || scope.sessionRevision !== session.sessionRevision()) {
              patchState(store, { currencyCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.scopeVersion();
            patchState(store, {
              currencyCallState: pendingCallState(store.currencyCallState().data),
            });
            return api.readCurrency(scope.organizationId).pipe(
              tapResponse({
                next: (currency) => {
                  if (
                    current(scope, generation) &&
                    currency.organizationId === scope.organizationId
                  )
                    patchState(store, { currencyCallState: successCallState(currency) });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, {
                      currencyCallState: errorCallState(
                        toStoreError(error),
                        store.currencyCallState().data,
                      ),
                    });
                },
              }),
            );
          }),
        ),
      );
      const readRates = rxMethod<{
        readonly scope: MaintenanceCostScope;
        readonly page: number;
      } | null>(
        pipe(
          switchMap((query) => {
            if (
              !query ||
              !readable() ||
              query.scope.sessionRevision !== session.sessionRevision()
            ) {
              patchState(store, { ratesCallState: idleCallState() });
              return EMPTY;
            }
            const { scope, page } = query,
              generation = store.scopeVersion();
            patchState(store, { ratePage: page, ratesCallState: pendingCallState() });
            return api.listRates(scope.organizationId, { page, itemsPerPage: 30 }).pipe(
              tapResponse({
                next: (collection) => {
                  if (current(scope, generation))
                    patchState(
                      store,
                      setAllEntities([...collection.member], { collection: 'rate' }),
                      { rateTotal: collection.totalItems, ratesCallState: successCallState(null) },
                    );
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { ratesCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      const readMembers = rxMethod<MaintenanceCostScope | null>(
        pipe(
          switchMap((scope) => {
            if (
              !scope ||
              !readable() ||
              scope.sessionRevision !== session.sessionRevision() ||
              !permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ)
            ) {
              patchState(store, { membersCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.scopeVersion();
            patchState(store, {
              membersCallState: pendingCallState(store.membersCallState().data),
            });
            return members.listAll(scope.organizationId).pipe(
              tapResponse({
                next: (roster) => {
                  if (
                    current(scope, generation) &&
                    permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ)
                  )
                    patchState(store, {
                      membersCallState: successCallState(
                        roster
                          .filter((member) => member.isActive)
                          .map((member) =>
                            toMemberSelectOption(member, scope.organizationId, member.id),
                          ),
                      ),
                    });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { membersCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      const request = (command: MaintenanceCostCommand): Observable<MaintenanceCostMutation> => {
        switch (command.kind) {
          case 'planning':
            return api.writePlanning(
              command.organizationId,
              command.interventionId,
              command.input,
              command.revision,
            );
          case 'expense':
            return api.createExpense(command.organizationId, command.interventionId, command.input);
          case 'currency':
            return api.writeCurrency(command.organizationId, command.currency);
          case 'rate':
            return api.createRate(command.organizationId, command.input);
        }
      };
      const write = rxMethod<MaintenanceCostCommand>(
        pipe(
          exhaustMap((incoming) => {
            const scope = store.scope();
            if (
              !scope ||
              !readable() ||
              scope.sessionRevision !== session.sessionRevision() ||
              !permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE) ||
              scope.organizationId !== incoming.organizationId ||
              ('interventionId' in incoming && scope.interventionId !== incoming.interventionId)
            )
              return EMPTY;
            const generation = store.scopeVersion();
            const command = store.uncertainWrite()
              ? (store.command() ?? incoming)
              : structuredClone(incoming);
            patchState(store, { command, writeCallState: pendingCallState() });
            return request(command).pipe(
              tapResponse({
                next: (result) => {
                  if (!current(scope, generation)) {
                    patchState(store, { writeCallState: idleCallState(), command: null });
                    return;
                  }
                  if (
                    (command.kind === 'planning' || command.kind === 'expense') &&
                    'interventionId' in result
                  ) {
                    if (
                      result.organizationId !== scope.organizationId ||
                      result.interventionId !== scope.interventionId
                    ) {
                      patchState(store, { writeCallState: idleCallState(), command: null });
                      return;
                    }
                    patchState(store, { costCallState: successCallState(result) });
                  }
                  if (command.kind === 'currency' && 'locked' in result) {
                    if (result.organizationId !== scope.organizationId) {
                      patchState(store, { writeCallState: idleCallState(), command: null });
                      return;
                    }
                    patchState(store, { currencyCallState: successCallState(result) });
                  }
                  patchState(store, { command: null, writeCallState: successCallState(result) });
                  if (command.kind === 'rate') readRates({ scope, page: store.ratePage() });
                  dispatcher.dispatch(
                    maintenanceCostStoreEvents.saved({
                      organizationId: command.organizationId,
                      kind: command.kind,
                    }),
                  );
                  dispatcher.dispatch(
                    maintenanceCostStoreEvents.feedback(
                      successFeedback(
                        $localize`:@@maintenanceCost.feedback.saved:Financial information saved.`,
                      ),
                    ),
                  );
                },
                error: (error: unknown) => {
                  if (!current(scope, generation)) {
                    patchState(store, { writeCallState: idleCallState(), command: null });
                    return;
                  }
                  const failure = toStoreError(error);
                  patchState(store, { writeCallState: errorCallState(failure) });
                  dispatcher.dispatch(
                    maintenanceCostStoreEvents.feedback(
                      toStoreFailureEventPayload(
                        failure,
                        $localize`:@@maintenanceCost.feedback.failed:Financial information could not be saved.`,
                      ),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      );
      return {
        /**
         * Method setScope
         *
         * @description
         * Invalidates reads and hidden private data when organization, intervention or session
         * changes.
         */
        setScope(scope: MaintenanceCostScope | null): void {
          if (JSON.stringify(scope) === JSON.stringify(store.scope())) return;
          const pending = store.writePending();
          readCost(null);
          readCurrency(null);
          readRates(null);
          readMembers(null);
          patchState(store, INITIAL_STATE, removeAllEntities({ collection: 'rate' }), {
            scope,
            scopeVersion: store.scopeVersion() + 1,
            writeCallState: pending ? pendingCallState() : idleCallState(),
          });
        },
        readCost,
        readCurrency,
        readRates,
        readMembers,
        write,
        /**
         * Method retryWrite
         *
         * @description
         * Reuses the unchanged original command after an uncertain transport result.
         */
        retryWrite(): void {
          const retained = store.command();
          if (retained && store.uncertainWrite()) write(retained);
        },
      };
    },
  ),
  withHooks(
    (
      store,
      session = inject(AUTH_SESSION_PORT),
      permissions = inject(OrganizationPermissionService),
    ) => ({
      onInit(): void {
        effect(() => {
          const scope = store.scope();
          if (
            scope &&
            (scope.sessionRevision !== session.sessionRevision() ||
              !session.isAuthenticated() ||
              !permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ))
          )
            untracked(() => store.setScope(null));
        });
      },
    }),
  ),
);

/**
 * Type MaintenanceCostStoreType
 *
 * @description
 * Public route-scoped financial store instance.
 *
 * @type MaintenanceCostStoreType
 */
export type MaintenanceCostStoreType = InstanceType<typeof MaintenanceCostStore>;
