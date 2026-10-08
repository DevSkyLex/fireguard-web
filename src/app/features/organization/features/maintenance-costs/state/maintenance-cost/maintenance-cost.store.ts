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
import {
  EMPTY,
  catchError,
  defer,
  exhaustMap,
  map,
  pipe,
  switchMap,
  tap,
  throwError,
  type Observable,
} from 'rxjs';
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
import {
  MaintenanceCostCommandRepository,
  MaintenanceCostService,
} from '@features/organization/features/maintenance-costs/data-access';
import type {
  MaintenanceCostCommand,
  MaintenanceRateOutput,
} from '@features/organization/features/maintenance-costs/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { toMemberSelectOption } from '@features/organization/utils';
import { maintenanceCostStoreEvents } from './events/events';
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
  scopeUserId: null,
  journalCallState: idleCallState(),
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
  withComputed(
    (
      store,
      journal = inject(MaintenanceCostCommandRepository),
      session = inject(AUTH_SESSION_PORT),
      permissions = inject(OrganizationPermissionService),
    ) => ({
      journalReady: computed(() => {
        const scope = store.scope();
        return (
          store.journalCallState().status === 'success' &&
          !!scope &&
          session.isAuthenticated() &&
          scope.sessionRevision === session.sessionRevision() &&
          permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ) &&
          store.scopeUserId() !== null &&
          store.scopeUserId() === journal.captureOwner(scope.organizationId, scope.sessionRevision)
        );
      }),
      writePending: computed(() => store.writeCallState().status === 'pending'),
      uncertainWrite: computed(
        () =>
          store.writeCallState().status === 'error' &&
          !!store.command() &&
          (store.writeCallState().error?.retryable === true ||
            store.writeCallState().error?.code === 0),
      ),
    }),
  ),
  withMethods(
    (
      store,
      api = inject(MaintenanceCostService),
      members = inject(OrganizationMemberService),
      permissions = inject(OrganizationPermissionService),
      session = inject(AUTH_SESSION_PORT),
      platform = inject(PLATFORM_ID),
      dispatcher = inject(Dispatcher),
      journal = inject(MaintenanceCostCommandRepository),
    ) => {
      const readable = (): boolean =>
        isPlatformBrowser(platform) &&
        session.isAuthenticated() &&
        permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ);
      const current = (scope: MaintenanceCostScope, generation: number): boolean =>
        readable() &&
        generation === store.scopeVersion() &&
        session.sessionRevision() === scope.sessionRevision &&
        store.scopeUserId() !== null &&
        store.scopeUserId() === journal.captureOwner(scope.organizationId, scope.sessionRevision) &&
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
      const hydrate = rxMethod<MaintenanceCostScope | null>(
        pipe(
          switchMap((scope) => {
            if (!scope || !readable()) return EMPTY;
            const generation = store.scopeVersion();
            patchState(store, { journalCallState: pendingCallState() });
            return defer(() =>
              journal.readPending(scope.organizationId, scope.interventionId),
            ).pipe(
              tapResponse({
                next: (command) => {
                  if (!current(scope, generation)) return;
                  patchState(store, {
                    journalCallState: successCallState(null),
                    ...(command
                      ? {
                          command,
                          writeCallState: errorCallState(
                            toStoreError({
                              type: 'about:blank',
                              status: 0,
                              title: 'Unconfirmed financial declaration',
                              detail: $localize`:@@maintenanceCost.recovery.uncertain:The previous declaration has no confirmed result. Retry it unchanged before creating another.`,
                            }),
                          ),
                        }
                      : {}),
                  });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { journalCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      const write = rxMethod<MaintenanceCostCommand>(
        pipe(
          exhaustMap((incoming) => {
            const scope = store.scope();
            if (
              !scope ||
              !store.journalReady() ||
              !current(scope, store.scopeVersion()) ||
              !readable() ||
              scope.sessionRevision !== session.sessionRevision() ||
              !permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE) ||
              scope.organizationId !== incoming.organizationId ||
              ('interventionId' in incoming && scope.interventionId !== incoming.interventionId)
            )
              return EMPTY;
            const generation = store.scopeVersion();
            const wasUncertain = store.uncertainWrite();
            const command = wasUncertain
              ? (store.command() ?? incoming)
              : structuredClone(incoming);
            const userId = store.scopeUserId();
            let transmitted = false;
            let acknowledged = false;
            const acknowledge = () =>
              defer(() => journal.acknowledge(command, scope.sessionRevision, userId)).pipe(
                tap(() => {
                  acknowledged = true;
                }),
                catchError(() =>
                  throwError(() => ({
                    type: 'about:blank',
                    status: 0,
                    title: 'Unconfirmed local acknowledgement',
                    detail: $localize`:@@maintenanceCost.recovery.uncertain:The previous declaration has no confirmed result. Retry it unchanged before creating another.`,
                  })),
                ),
              );
            patchState(store, { command, writeCallState: pendingCallState() });
            return defer(() => journal.retain(command)).pipe(
              switchMap(() => {
                if (!current(scope, generation)) {
                  if (!store.command()) patchState(store, { writeCallState: idleCallState() });
                  return EMPTY;
                }
                transmitted = true;
                return request(command);
              }),
              switchMap((result) => acknowledge().pipe(map(() => result))),
              catchError((error: unknown) => {
                const failure = toStoreError(error);
                return transmitted && !failure.retryable && failure.code !== 0
                  ? acknowledge().pipe(switchMap(() => throwError(() => error)))
                  : throwError(() => error);
              }),
              tapResponse({
                next: (result) => {
                  if (!current(scope, generation)) {
                    if (!store.command()) patchState(store, { writeCallState: idleCallState() });
                    return;
                  }
                  if (command.kind === 'expense' || command.kind === 'rate') hydrate(scope);
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
                    if (!store.command()) patchState(store, { writeCallState: idleCallState() });
                    return;
                  }
                  const failure =
                    !transmitted && wasUncertain
                      ? {
                          ...toStoreError(error),
                          code: 0,
                          retryable: true,
                          message: $localize`:@@maintenanceCost.recovery.uncertain:The previous declaration has no confirmed result. Retry it unchanged before creating another.`,
                        }
                      : toStoreError(error);
                  if (acknowledged && (command.kind === 'expense' || command.kind === 'rate'))
                    hydrate(scope);
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
          const userId = scope
            ? journal.captureOwner(scope.organizationId, scope.sessionRevision)
            : null;
          if (
            JSON.stringify(scope) === JSON.stringify(store.scope()) &&
            store.scopeUserId() === userId
          )
            return;
          const pending = store.writePending();
          readCost(null);
          readCurrency(null);
          readRates(null);
          readMembers(null);
          hydrate(null);
          patchState(store, INITIAL_STATE, removeAllEntities({ collection: 'rate' }), {
            scope,
            scopeUserId: userId,
            scopeVersion: store.scopeVersion() + 1,
            writeCallState: pending ? pendingCallState() : idleCallState(),
          });
          hydrate(scope);
        },
        readCost,
        readCurrency,
        readRates,
        readMembers,
        hydrate,
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
      journal = inject(MaintenanceCostCommandRepository),
    ) => ({
      onInit(): void {
        effect(() => {
          const scope = store.scope();
          if (
            scope &&
            (scope.sessionRevision !== session.sessionRevision() ||
              store.scopeUserId() !==
                journal.captureOwner(scope.organizationId, scope.sessionRevision) ||
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
