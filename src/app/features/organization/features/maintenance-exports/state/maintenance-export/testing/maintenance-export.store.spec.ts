import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { MaintenanceExportService } from '@features/organization/features/maintenance-exports/data-access';
import type { MaintenanceExportOutput } from '@features/organization/features/maintenance-exports/models';
import { maintenanceExportFixture } from '@features/organization/features/maintenance-exports/models/export/testing/maintenance-export.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  MaintenanceExportStore,
  type MaintenanceExportStoreType,
} from '../maintenance-export.store';

describe('MaintenanceExportStore boundaries', () => {
  let store: MaintenanceExportStoreType;
  const authenticated = signal(true),
    revision = signal(1),
    grants = signal<readonly string[]>([]);
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let customers: { list: ReturnType<typeof vi.fn> },
    facilities: { list: ReturnType<typeof vi.fn> },
    equipments: { list: ReturnType<typeof vi.fn> };
  const archive = maintenanceExportFixture(),
    scope = { organizationId: 'org', sessionRevision: 1 };
  const input = {
    clientOperationId: 'stable-create',
    interventionIds: ['dossier-1'],
    system: 'ERP',
    includeInternalCosts: false,
  };
  const setup = (platform = 'browser'): void => {
    TestBed.configureTestingModule({
      providers: [
        MaintenanceExportStore,
        { provide: MaintenanceExportService, useValue: api },
        { provide: CustomerService, useValue: customers },
        { provide: FacilityService, useValue: facilities },
        { provide: EquipmentService, useValue: equipments },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision: revision },
        },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    store = TestBed.inject(MaintenanceExportStore);
    store.setScope(scope);
  };
  beforeEach(() => {
    authenticated.set(true);
    revision.set(1);
    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE,
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM,
    ]);
    api = {
      list: vi.fn().mockReturnValue(of({ member: [archive], totalItems: 1 })),
      read: vi.fn().mockReturnValue(of(archive)),
      listSources: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      listReferences: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      create: vi.fn().mockReturnValue(of(archive)),
      adjust: vi.fn().mockReturnValue(
        of(
          maintenanceExportFixture({
            id: 'adjusted',
            kind: 'adjustment',
            adjustmentOf: archive.id,
            originalExportId: archive.id,
          }),
        ),
      ),
      confirm: vi.fn().mockReturnValue(of(maintenanceExportFixture({ state: 'import_confirmed' }))),
      writeReference: vi.fn().mockReturnValue(of({ id: 'mapping', revision: 1 })),
      download: vi.fn().mockReturnValue(of(new Blob(['retained']))),
    };
    customers = {
      list: vi.fn().mockReturnValue(
        of({
          member: [{ id: 'customer', name: 'Client', contacts: ['private'] }],
          totalItems: 1,
        }),
      ),
    };
    facilities = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    equipments = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
  });
  it.each(['server', 'anonymous', 'no-read'])('fetches no private data for %s', (mode) => {
    if (mode === 'anonymous') authenticated.set(false);
    if (mode === 'no-read') grants.set([]);
    setup(mode === 'server' ? 'server' : 'browser');
    store.load({ page: 1 });
    store.read(archive.id);
    store.loadSources({ page: 1 });
    store.loadReferences({ page: 1 });
    expect(api['list']).not.toHaveBeenCalled();
    expect(api['read']).not.toHaveBeenCalled();
    expect(api['listSources']).not.toHaveBeenCalled();
    expect(api['listReferences']).not.toHaveBeenCalled();
  });
  it('cancels a read when the organization changes and rejects old data', () => {
    setup();
    const old = new Subject<MaintenanceExportOutput>();
    api['read']?.mockReturnValue(old);
    store.read(archive.id);
    expect(old.observed).toBe(true);
    store.setScope({ ...scope, organizationId: 'other' });
    expect(old.observed).toBe(false);
    old.next(archive);
    expect(store.detailCallState().data).toBeNull();
  });
  it('keeps an accepted write alive while a late result cannot populate another organization', () => {
    setup();
    const accepted = new Subject<MaintenanceExportOutput>();
    api['create']?.mockReturnValue(accepted);
    store.write({ kind: 'create', organizationId: 'org', input });
    store.write({ kind: 'create', organizationId: 'org', input });
    expect(api['create']).toHaveBeenCalledTimes(1);
    store.setScope({ ...scope, organizationId: 'other' });
    expect(accepted.observed).toBe(true);
    expect(store.writePending()).toBe(true);
    accepted.next(archive);
    accepted.complete();
    expect(store.detailCallState().data).toBeNull();
    expect(store.writeCallState().data).toBeNull();
  });
  it('replays the same operation key and frozen payload after a lost response', () => {
    setup();
    api['create']
      ?.mockReturnValueOnce(
        throwError(() => ({
          type: 'about:blank',
          status: 0,
          title: 'Network',
          detail: 'Lost reply',
        })),
      )
      .mockReturnValue(of(archive));
    const draft = { ...input, interventionIds: [...input.interventionIds] };
    store.write({ kind: 'create', organizationId: 'org', input: draft });
    expect(store.uncertainWrite()).toBe(true);
    draft.system = 'changed';
    draft.interventionIds.push('unreviewed');
    store.write({ kind: 'create', organizationId: 'org', input: draft });
    expect(api['create']?.mock.calls[1]?.[1]).toEqual(input);
    expect(store.command()).toBeNull();
  });
  it('retains a confirmed stale-revision command for explicit review and does not classify it as an uncertain transport', () => {
    setup();
    store.read(archive.id);
    api['adjust']?.mockReturnValue(
      throwError(() => ({
        type: 'about:blank',
        status: 412,
        title: 'Changed source',
        detail: 'Review latest revision.',
      })),
    );
    store.write({
      kind: 'adjust',
      organizationId: 'org',
      exportId: archive.id,
      revision: 1,
      input: { clientOperationId: 'stable-adjust', reason: 'Validated amendment' },
    });
    expect(store.writeCallState().error?.code).toBe(412);
    expect(store.command()).toMatchObject({ revision: 1 });
    expect(store.uncertainWrite()).toBe(false);
    expect(store.detailCallState().data).toEqual(archive);
  });
  it('requires confirm permission independently from export management', () => {
    setup();
    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE,
    ]);
    store.write({
      kind: 'confirm',
      organizationId: 'org',
      exportId: archive.id,
      revision: 1,
      input: { clientOperationId: 'ack', externalImportReference: 'IMPORT-1' },
    });
    expect(api['confirm']).not.toHaveBeenCalled();
  });
  it('requires financial permission independently for cost creation and retained download', () => {
    setup();
    store.write({
      kind: 'create',
      organizationId: 'org',
      input: { ...input, includeInternalCosts: true },
    });
    store.download({ exportId: 'private', format: 'json', includeInternalCosts: true });
    expect(api['create']).not.toHaveBeenCalled();
    expect(api['download']).not.toHaveBeenCalled();
    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    store.setScope(scope);
    store.write({
      kind: 'create',
      organizationId: 'org',
      input: { ...input, includeInternalCosts: true },
    });
    expect(api['create']).toHaveBeenCalledTimes(1);
  });
  it('does not accept a financial download after its permission is revoked in flight', () => {
    setup();
    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    store.setScope(scope);
    const bytes = new Subject<Blob>();
    api['download']?.mockReturnValue(bytes);
    store.download({ exportId: 'private', format: 'json', includeInternalCosts: true });
    grants.set(
      grants().filter((permission) => permission !== ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ),
    );
    bytes.next(new Blob(['private']));
    expect(store.downloadCallState().data).toBeNull();
  });
  it.each(['session', 'permission', 'logout'])(
    'clears cached data after %s replacement',
    (mode) => {
      setup();
      store.load({ page: 1 });
      store.read(archive.id);
      if (mode === 'session') revision.set(2);
      if (mode === 'permission') grants.set([]);
      if (mode === 'logout') authenticated.set(false);
      TestBed.tick();
      expect(store.scope()).toBeNull();
      expect(store.exportEntities()).toEqual([]);
      expect(store.detailCallState().data).toBeNull();
    },
  );
  it('requests a mapping directory only with its own read permission and keeps contacts out of the projection', () => {
    setup();
    store.loadTargets({ resourceType: 'customer', page: 1 });
    expect(customers.list).not.toHaveBeenCalled();
    grants.set([...grants(), ORGANIZATION_PERMISSION.CUSTOMERS_READ]);
    store.loadTargets({ resourceType: 'customer', page: 2, search: 'Client' });
    expect(customers.list).toHaveBeenCalledWith('org', {
      page: 2,
      itemsPerPage: 30,
      search: 'Client',
      params: { archived: false },
    });
    expect(store.targetsCallState().data?.member).toEqual([{ id: 'customer', label: 'Client' }]);
  });
  it('reads archived customers on server pages under the same independent directory permission', () => {
    grants.set([...grants(), ORGANIZATION_PERMISSION.CUSTOMERS_READ]);
    setup();
    customers.list.mockReturnValue(
      of({
        member: [
          {
            id: 'archived-customer',
            name: 'Archived operator',
            archivedAt: '2026-10-07T12:00:00Z',
            contacts: ['private'],
          },
        ],
        totalItems: 61,
      }),
    );
    store.loadTargets({ resourceType: 'customer', page: 3, search: 'operator', archived: true });
    expect(customers.list).toHaveBeenCalledWith('org', {
      page: 3,
      itemsPerPage: 30,
      search: 'operator',
      params: { archived: true },
    });
    expect(store.targetsCallState().data).toEqual({
      member: [{ id: 'archived-customer', label: 'Archived operator' }],
      totalItems: 61,
    });
    grants.set(grants().filter((grant) => grant !== ORGANIZATION_PERMISSION.CUSTOMERS_READ));
    store.loadTargets({ resourceType: 'customer', page: 1, archived: true });
    expect(customers.list).toHaveBeenCalledOnce();
    expect(store.targetsCallState().data).toBeNull();
  });
  it('distinguishes a successfully absent mapping from a failed read before revision zero can be used', () => {
    setup();
    store.readMapping({ system: 'ERP', resourceType: 'equipment', resourceId: 'equipment' });
    expect(store.mappingCallState().status).toBe('success');
    expect(store.mappingCallState().data).toBeNull();
    api['listReferences']?.mockReturnValue(
      throwError(() => ({
        type: 'about:blank',
        status: 403,
        title: 'Forbidden',
        detail: 'Mapping read denied.',
      })),
    );
    store.readMapping({ system: 'ERP', resourceType: 'equipment', resourceId: 'equipment' });
    expect(store.mappingCallState().status).toBe('error');
    expect(store.mappingCallState().error?.code).toBe(403);
  });

  it('clears private list metadata when finance is revoked without a selected detail', () => {
    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    setup();
    api['list']?.mockReturnValue(
      of({
        member: [
          maintenanceExportFixture({
            includeInternalCosts: true,
            costsComplete: false,
            incompleteCostCount: 1,
          }),
        ],
        totalItems: 1,
      }),
    );
    store.load({ page: 1 });
    expect(store.exportEntities()).toHaveLength(1);
    expect(store.detailCallState().data).toBeNull();
    grants.set(grants().filter((grant) => grant !== ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ));
    TestBed.tick();
    expect(store.exportEntities()).toEqual([]);
    expect(store.listCallState().data).toBeNull();
    expect(store.scope()).toBeNull();
  });

  it('rejects a private pending list reply before permission invalidation has run', () => {
    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    setup();
    const pending = new Subject<{ member: MaintenanceExportOutput[]; totalItems: number }>();
    api['list']?.mockReturnValue(pending);
    store.load({ page: 1 });
    grants.set(grants().filter((grant) => grant !== ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ));
    pending.next({
      member: [maintenanceExportFixture({ includeInternalCosts: true })],
      totalItems: 1,
    });
    expect(store.exportEntities()).toEqual([]);
    TestBed.tick();
    expect(pending.observed).toBe(false);
  });

  it('does not restore a private accepted write receipt after financial access is revoked', () => {
    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    setup();
    const accepted = new Subject<MaintenanceExportOutput>();
    api['create']?.mockReturnValue(accepted);
    store.write({
      kind: 'create',
      organizationId: 'org',
      input: { ...input, includeInternalCosts: true },
    });
    grants.set(grants().filter((grant) => grant !== ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ));
    TestBed.tick();
    expect(accepted.observed).toBe(true);
    accepted.next(maintenanceExportFixture({ includeInternalCosts: true }));
    expect(store.writeCallState().data).toBeNull();
    expect(store.detailCallState().data).toBeNull();
  });

  it('cancels an obsolete download read so the new organization can request its own retained bytes', () => {
    setup();
    const obsolete = new Subject<Blob>();
    api['download']?.mockReturnValueOnce(obsolete);
    store.download({ exportId: 'old-export', format: 'csv', includeInternalCosts: false });
    expect(obsolete.observed).toBe(true);
    store.setScope({ ...scope, organizationId: 'other' });
    expect(obsolete.observed).toBe(false);
    store.download({ exportId: 'other-export', format: 'json', includeInternalCosts: false });
    expect(api['download']).toHaveBeenLastCalledWith('other', 'other-export', 'json');
    expect(store.downloadCallState().status).toBe('success');
  });
});
