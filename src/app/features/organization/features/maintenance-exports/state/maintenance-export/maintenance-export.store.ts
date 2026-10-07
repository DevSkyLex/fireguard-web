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
import { EMPTY, exhaustMap, map, pipe, switchMap, type Observable } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { MaintenanceExportService } from '@features/organization/features/maintenance-exports/data-access';
import type {
  MaintenanceExportOutput,
  MaintenanceExportReferenceOutput,
  MaintenanceExportReferencePage,
  MaintenanceExportResourceType,
} from '@features/organization/features/maintenance-exports/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { maintenanceExportStoreEvents } from './events/events';
import type {
  MaintenanceExportScope,
  MaintenanceExportState,
  MaintenanceExportCommand,
} from './models/maintenance-export-state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Idle browser-private state contains neither session data nor SSR transfer values.
 */
const INITIAL_STATE: MaintenanceExportState = {
  financialAccess: false,
  scope: null,
  generation: 0,
  page: 1,
  total: 0,
  selectedId: null,
  listCallState: idleCallState(),
  detailCallState: idleCallState(),
  sourcesCallState: idleCallState(),
  referencesCallState: idleCallState(),
  mappingCallState: idleCallState(),
  targetsCallState: idleCallState(),
  writeCallState: idleCallState(),
  downloadCallState: idleCallState(),
  command: null,
};

/**
 * Constant MaintenanceExportStore
 *
 * @description
 * Browser-only archive state fences cancellable reads and accepted receipt-backed writes by
 * organization and authenticated session.
 */
export const MaintenanceExportStore = signalStore(
  withEntities({ entity: type<MaintenanceExportOutput>(), collection: 'export' }),
  withState<MaintenanceExportState>(INITIAL_STATE),
  withComputed((store) => ({
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 30))),
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
      api = inject(MaintenanceExportService),
      customers = inject(CustomerService),
      facilities = inject(FacilityService),
      equipments = inject(EquipmentService),
      permissions = inject(OrganizationPermissionService),
      session = inject(AUTH_SESSION_PORT),
      platform = inject(PLATFORM_ID),
      dispatcher = inject(Dispatcher),
    ) => {
      const readable = (): boolean =>
        isPlatformBrowser(platform) &&
        session.isAuthenticated() &&
        store.scope()?.sessionRevision === session.sessionRevision() &&
        permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ);
      const current = (scope: MaintenanceExportScope, generation: number): boolean =>
        readable() &&
        scope.sessionRevision === session.sessionRevision() &&
        generation === store.generation() &&
        store.financialAccess() ===
          permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ) &&
        scope.organizationId === store.scope()?.organizationId;
      const load = rxMethod<{ readonly page: number; readonly system?: string } | null>(
        pipe(
          switchMap((query) => {
            const scope = store.scope();
            if (!query || !scope || !readable()) return EMPTY;
            const generation = store.generation();
            patchState(
              store,
              { page: query.page, listCallState: pendingCallState() },
              removeAllEntities({ collection: 'export' }),
            );
            return api
              .list(scope.organizationId, {
                page: query.page,
                itemsPerPage: 30,
                params: query.system ? { system: query.system } : {},
              })
              .pipe(
                tapResponse({
                  next: (collection) => {
                    if (current(scope, generation))
                      patchState(
                        store,
                        setAllEntities([...collection.member], { collection: 'export' }),
                        { total: collection.totalItems, listCallState: successCallState(null) },
                      );
                  },
                  error: (error: unknown) => {
                    if (current(scope, generation))
                      patchState(store, { listCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
          }),
        ),
      );
      const read = rxMethod<string | null>(
        pipe(
          switchMap((id) => {
            const scope = store.scope();
            if (!id || !scope || !readable()) {
              patchState(store, { selectedId: null, detailCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.generation(),
              retained = store.selectedId() === id ? store.detailCallState().data : null;
            patchState(store, { selectedId: id, detailCallState: pendingCallState(retained) });
            return api.read(scope.organizationId, id).pipe(
              tapResponse({
                next: (result) => {
                  if (current(scope, generation) && result.organizationId === scope.organizationId)
                    patchState(store, { detailCallState: successCallState(result) });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, {
                      detailCallState: errorCallState(toStoreError(error), retained),
                    });
                },
              }),
            );
          }),
        ),
      );
      const loadSources = rxMethod<{ readonly page: number; readonly search?: string } | null>(
        pipe(
          switchMap((query) => {
            const scope = store.scope();
            if (!query || !scope || !readable()) {
              patchState(store, { sourcesCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.generation();
            patchState(store, { sourcesCallState: pendingCallState() });
            return api.listSources(scope.organizationId, { ...query, itemsPerPage: 30 }).pipe(
              tapResponse({
                next: (collection) => {
                  if (current(scope, generation))
                    patchState(store, { sourcesCallState: successCallState(collection) });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { sourcesCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      const loadReferences = rxMethod<{ readonly page: number; readonly system?: string } | null>(
        pipe(
          switchMap((query) => {
            const scope = store.scope();
            if (!query || !scope || !readable()) {
              patchState(store, { referencesCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.generation();
            patchState(store, { referencesCallState: pendingCallState() });
            return api
              .listReferences(scope.organizationId, {
                page: query.page,
                itemsPerPage: 30,
                params: query.system ? { system: query.system } : {},
              })
              .pipe(
                tapResponse({
                  next: (collection) => {
                    if (current(scope, generation))
                      patchState(store, { referencesCallState: successCallState(collection) });
                  },
                  error: (error: unknown) => {
                    if (current(scope, generation))
                      patchState(store, {
                        referencesCallState: errorCallState(toStoreError(error)),
                      });
                  },
                }),
              );
          }),
        ),
      );
      const readMapping = rxMethod<{
        readonly system: string;
        readonly resourceType: MaintenanceExportResourceType;
        readonly resourceId: string;
      } | null>(
        pipe(
          switchMap((query) => {
            const scope = store.scope();
            if (!query || !scope || !readable()) {
              patchState(store, { mappingCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.generation();
            patchState(store, { mappingCallState: pendingCallState() });
            return api
              .listReferences(scope.organizationId, {
                page: 1,
                itemsPerPage: 30,
                params: { ...query },
              })
              .pipe(
                tapResponse({
                  next: (collection) => {
                    if (current(scope, generation))
                      patchState(store, {
                        mappingCallState: successCallState(
                          collection.member.find(
                            (item) =>
                              item.resourceId === query.resourceId &&
                              item.resourceType === query.resourceType &&
                              item.system === query.system,
                          ) ?? null,
                        ),
                      });
                  },
                  error: (error: unknown) => {
                    if (current(scope, generation))
                      patchState(store, { mappingCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
          }),
        ),
      );
      const loadTargets = rxMethod<{
        readonly resourceType: MaintenanceExportResourceType;
        readonly page: number;
        readonly search?: string;
        readonly archived?: boolean;
      } | null>(
        pipe(
          switchMap((query) => {
            const scope = store.scope();
            if (!query || !scope || !readable()) {
              patchState(store, { targetsCallState: idleCallState() });
              return EMPTY;
            }
            const generation = store.generation();
            const options = { page: query.page, itemsPerPage: 30, search: query.search };
            let request: Observable<MaintenanceExportReferencePage>;
            if (
              query.resourceType === 'customer' &&
              permissions.hasPermission(ORGANIZATION_PERMISSION.CUSTOMERS_READ)
            )
              request = customers
                .list(scope.organizationId, {
                  ...options,
                  params: { archived: query.archived ?? false },
                })
                .pipe(
                  map((page) => ({
                    member: page.member.map((item) => ({ id: item.id, label: item.name })),
                    totalItems: page.totalItems,
                  })),
                );
            else if (
              query.resourceType === 'site' &&
              permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ)
            )
              request = facilities
                .list(scope.organizationId, { ...options, rootsOnly: true, includeArchived: true })
                .pipe(
                  map((page) => ({
                    member: page.member
                      .filter((item) => item.type === 'site')
                      .map((item) => ({ id: item.id, label: item.name })),
                    totalItems: page.totalItems,
                  })),
                );
            else if (
              query.resourceType === 'equipment' &&
              permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ)
            )
              request = equipments.list(scope.organizationId, options).pipe(
                map((page) => ({
                  member: page.member.map((item) => ({
                    id: item.id,
                    label: item.name ?? item.assetCode ?? item.serialNumber ?? item.type,
                  })),
                  totalItems: page.totalItems,
                })),
              );
            else {
              patchState(store, { targetsCallState: idleCallState() });
              return EMPTY;
            }
            patchState(store, { targetsCallState: pendingCallState() });
            return request.pipe(
              tapResponse({
                next: (collection) => {
                  if (current(scope, generation))
                    patchState(store, { targetsCallState: successCallState(collection) });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { targetsCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      const request = (
        command: MaintenanceExportCommand,
      ): Observable<MaintenanceExportOutput | MaintenanceExportReferenceOutput> => {
        switch (command.kind) {
          case 'create':
            return api.create(command.organizationId, command.input);
          case 'adjust':
            return api.adjust(
              command.organizationId,
              command.exportId,
              command.input,
              command.revision,
            );
          case 'confirm':
            return api.confirm(
              command.organizationId,
              command.exportId,
              command.input,
              command.revision,
            );
          case 'reference':
            return api.writeReference(
              command.organizationId,
              command.resourceType,
              command.resourceId,
              command.input,
              command.revision,
            );
        }
      };
      const write = rxMethod<MaintenanceExportCommand>(
        pipe(
          exhaustMap((incoming) => {
            const scope = store.scope();
            if (
              !scope ||
              !readable() ||
              scope.sessionRevision !== session.sessionRevision() ||
              scope.organizationId !== incoming.organizationId ||
              !permissions.hasPermission(
                incoming.kind === 'confirm'
                  ? ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM
                  : ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE,
              )
            )
              return EMPTY;
            const command = store.uncertainWrite()
              ? (store.command() ?? incoming)
              : structuredClone(incoming);
            const detail = store.detailCallState().data;
            if (
              ((command.kind === 'create' && command.input.includeInternalCosts) ||
                ((command.kind === 'adjust' || command.kind === 'confirm') &&
                  detail?.includeInternalCosts)) &&
              !permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ)
            )
              return EMPTY;
            const generation = store.generation();
            patchState(store, { command, writeCallState: pendingCallState() });
            return request(command).pipe(
              tapResponse({
                next: (result) => {
                  if (!current(scope, generation)) {
                    patchState(store, { writeCallState: idleCallState(), command: null });
                    return;
                  }
                  if (
                    'organizationId' in result &&
                    result.organizationId !== scope.organizationId
                  ) {
                    patchState(store, { writeCallState: idleCallState(), command: null });
                    return;
                  }
                  patchState(store, {
                    writeCallState: successCallState(result),
                    command: null,
                    ...('sourceInterventionIds' in result
                      ? { selectedId: result.id, detailCallState: successCallState(result) }
                      : { mappingCallState: successCallState(result) }),
                  });
                  dispatcher.dispatch(
                    maintenanceExportStoreEvents.acknowledged({
                      organizationId: scope.organizationId,
                      sessionRevision: scope.sessionRevision,
                      kind: command.kind,
                      id: result.id,
                    }),
                  );
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
                  else patchState(store, { writeCallState: idleCallState(), command: null });
                },
              }),
            );
          }),
        ),
      );
      const download = rxMethod<{
        readonly exportId: string;
        readonly format: 'json' | 'csv';
        readonly includeInternalCosts: boolean;
      } | null>(
        pipe(
          switchMap((query) => {
            const scope = store.scope();
            if (
              !query ||
              !scope ||
              !readable() ||
              (query.includeInternalCosts &&
                !permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ))
            )
              return EMPTY;
            const generation = store.generation();
            patchState(store, { downloadCallState: pendingCallState() });
            return api.download(scope.organizationId, query.exportId, query.format).pipe(
              tapResponse({
                next: (blob) => {
                  if (
                    current(scope, generation) &&
                    (!query.includeInternalCosts ||
                      permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ))
                  )
                    patchState(store, { downloadCallState: successCallState(blob) });
                  else patchState(store, { downloadCallState: idleCallState() });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { downloadCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      return {
        load,
        read,
        loadSources,
        loadReferences,
        loadTargets,
        readMapping,
        write,
        download,
        setScope(scope: MaintenanceExportScope | null): void {
          const financialAccess = permissions.hasPermission(
            ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ,
          );
          if (
            JSON.stringify(scope) === JSON.stringify(store.scope()) &&
            financialAccess === store.financialAccess()
          )
            return;
          const pending = store.writePending();
          patchState(store, INITIAL_STATE, removeAllEntities({ collection: 'export' }), {
            scope,
            financialAccess,
            generation: store.generation() + 1,
            writeCallState: pending ? pendingCallState() : idleCallState(),
          });
          load(null);
          read(null);
          loadSources(null);
          loadReferences(null);
          readMapping(null);
          loadTargets(null);
          download(null);
        },
        clearCommand(): void {
          if (!store.writePending() && !store.uncertainWrite())
            patchState(store, { command: null, writeCallState: idleCallState() });
        },
        clearDownload(): void {
          patchState(store, { downloadCallState: idleCallState() });
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
          const revision = session.sessionRevision();
          if (
            store.scope() &&
            (store.scope()?.sessionRevision !== revision ||
              !session.isAuthenticated() ||
              !permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ) ||
              store.financialAccess() !==
                permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ))
          )
            untracked(() => store.setScope(null));
        });
      },
    }),
  ),
);

/**
 * Type MaintenanceExportStoreType
 *
 * @description
 * Route-scoped archive state contract for its owning page.
 *
 * @type {MaintenanceExportStoreType}
 */
export type MaintenanceExportStoreType = InstanceType<typeof MaintenanceExportStore>;
