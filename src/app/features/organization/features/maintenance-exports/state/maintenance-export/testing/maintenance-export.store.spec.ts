import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { MaintenanceExportService } from '@features/organization/features/maintenance-exports/data-access';
import type {
  MaintenanceExportOutput,
  MaintenanceExportReferenceOutput,
  MaintenanceExportReferencePage,
  MaintenanceExportSourceOutput,
} from '@features/organization/features/maintenance-exports/models';
import { maintenanceExportFixture } from '@features/organization/features/maintenance-exports/models/export/testing/maintenance-export.fixture';
import { MaintenanceExportReferenceDirectoryService } from '@features/organization/features/maintenance-exports/services/maintenance-export-reference-directory';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { maintenanceExportStoreEvents } from '../events/events';
import {
  MaintenanceExportStore,
  type MaintenanceExportStoreType,
} from '../maintenance-export.store';

describe('MaintenanceExportStore', () => {
  let store: MaintenanceExportStoreType;
  const authenticated = signal(true),
    revision = signal(1),
    grants = signal<readonly string[]>([]);
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let directory: { list: ReturnType<typeof vi.fn> };
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> };
  const archive = maintenanceExportFixture(),
    scope = { organizationId: 'org', sessionRevision: 1 };
  const input = {
    clientOperationId: 'stable-create',
    interventionIds: ['dossier-1'],
    system: 'ERP',
    includeInternalCosts: false,
  };
  const mapping: MaintenanceExportReferenceOutput = {
    '@id': '/api/organizations/org/maintenance-export-references/mapping',
    '@type': 'MaintenanceExportReference',
    id: 'mapping',
    resourceType: 'equipment',
    resourceId: 'equipment',
    system: 'ERP',
    reference: 'EXT-EQUIPMENT',
    revision: 2,
    updatedAt: '2026-10-07T12:00:00Z',
  };
  const setup = (platform = 'browser'): void => {
    TestBed.configureTestingModule({
      providers: [
        MaintenanceExportStore,
        { provide: MaintenanceExportService, useValue: api },
        { provide: MaintenanceExportReferenceDirectoryService, useValue: directory },
        { provide: Dispatcher, useValue: dispatcher },
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
    directory = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    dispatcher = { dispatch: vi.fn() };
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
    store.loadTargets({ resourceType: 'customer', page: 1 });
    expect(directory.list).not.toHaveBeenCalled();
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

  it('requires the retained confirmation permission before replaying an uncertain command supplied as a creation', () => {
    setup();
    const original = maintenanceExportFixture({ revision: 7 });
    const confirmed = maintenanceExportFixture({ revision: 8, state: 'import_confirmed' });
    api['read']?.mockReturnValueOnce(of(original));
    api['confirm']
      ?.mockReturnValueOnce(
        throwError(() => ({
          type: 'about:blank',
          status: 0,
          title: 'Network',
          detail: 'Confirmation reply lost.',
        })),
      )
      .mockReturnValueOnce(of(confirmed));
    store.read(original.id);
    const confirmation = {
      clientOperationId: '6b13bfd1-3c18-4e8a-ad98-5129c7300fe1',
      externalImportReference: 'IMPORT-REVIEWED',
    };
    const draft = { ...confirmation };
    const retained = {
      kind: 'confirm' as const,
      organizationId: 'org',
      exportId: original.id,
      revision: 7,
      input: confirmation,
    };
    store.write({ ...retained, input: draft });
    expect(api['confirm']).toHaveBeenCalledExactlyOnceWith('org', original.id, confirmation, 7);
    expect(store.uncertainWrite()).toBe(true);
    draft.clientOperationId = 'f5be7221-893e-443a-9f47-42525040a66a';
    draft.externalImportReference = 'UNREVIEWED-CHANGE';

    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE,
    ]);
    store.write({ kind: 'create', organizationId: 'org', input });
    expect(api['confirm']).toHaveBeenCalledTimes(1);
    expect(api['create']).not.toHaveBeenCalled();
    expect(store.command()).toEqual(retained);
    expect(store.uncertainWrite()).toBe(true);
    expect(store.writeCallState().status).toBe('error');
    expect(dispatcher.dispatch).not.toHaveBeenCalled();

    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM]);
    store.write({ kind: 'create', organizationId: 'org', input });
    expect(api['confirm']).toHaveBeenCalledTimes(2);
    expect(api['confirm']?.mock.calls[1]).toEqual(['org', original.id, confirmation, 7]);
    expect(api['create']).not.toHaveBeenCalled();
    expect(store.writeCallState()).toMatchObject({ status: 'success', data: confirmed });
    expect(store.command()).toBeNull();
    expect(dispatcher.dispatch).toHaveBeenCalledExactlyOnceWith(
      maintenanceExportStoreEvents.acknowledged({ ...scope, kind: 'confirm', id: original.id }),
    );
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
  it('keeps a denied directory idle and passes the exact authorized owner query', () => {
    setup();
    directory.list.mockReturnValueOnce(null);
    store.loadTargets({ resourceType: 'customer', page: 1 });
    expect(store.targetsCallState().status).toBe('idle');
    directory.list.mockReturnValue(
      of({ member: [{ id: 'customer', label: 'Client' }], totalItems: 61 }),
    );
    store.loadTargets({ resourceType: 'customer', page: 3, search: 'operator', archived: true });
    expect(directory.list).toHaveBeenLastCalledWith('org', {
      resourceType: 'customer',
      page: 3,
      search: 'operator',
      archived: true,
    });
    expect(store.targetsCallState().data).toEqual({
      member: [{ id: 'customer', label: 'Client' }],
      totalItems: 61,
    });
  });
  it('cancels an obsolete directory read and rejects its late private choices', () => {
    setup();
    const pending = new Subject<MaintenanceExportReferencePage>();
    directory.list.mockReturnValueOnce(pending);
    store.loadTargets({ resourceType: 'customer', page: 1, archived: true });
    expect(store.targetsCallState().status).toBe('pending');
    expect(pending.observed).toBe(true);
    store.setScope({ ...scope, organizationId: 'other' });
    expect(pending.observed).toBe(false);
    pending.next({ member: [{ id: 'old', label: 'Old organization' }], totalItems: 1 });
    expect(store.targetsCallState().data).toBeNull();
    directory.list.mockReturnValueOnce(
      of({ member: [{ id: 'new', label: 'New organization' }], totalItems: 1 }),
    );
    store.loadTargets({ resourceType: 'site', page: 1 });
    expect(directory.list).toHaveBeenLastCalledWith('other', { resourceType: 'site', page: 1 });
    expect(store.targetsCallState().data).toEqual({
      member: [{ id: 'new', label: 'New organization' }],
      totalItems: 1,
    });
  });
  it('clears previous directory choices when its independent read permission is denied', () => {
    setup();
    directory.list.mockReturnValueOnce(
      of({ member: [{ id: 'archived-customer', label: 'Archived operator' }], totalItems: 61 }),
    );
    store.loadTargets({ resourceType: 'customer', page: 3, archived: true });
    directory.list.mockReturnValueOnce(null);
    store.loadTargets({ resourceType: 'customer', page: 1, archived: true });
    expect(store.targetsCallState().status).toBe('idle');
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

  it('replaces archive rows while a filtered server page loads and retains the authoritative total', () => {
    setup();
    store.load({ page: 1 });
    const page = new Subject<HydraCollection<MaintenanceExportOutput>>();
    api['list']?.mockReturnValueOnce(page);
    store.load({ page: 3, system: 'ERP' });
    expect(api['list']).toHaveBeenLastCalledWith('org', {
      page: 3,
      itemsPerPage: 30,
      params: { system: 'ERP' },
    });
    expect(store.listCallState().status).toBe('pending');
    expect(store.page()).toBe(3);
    expect(store.exportEntities()).toEqual([]);
    const lastArchive = maintenanceExportFixture({ id: 'last-export' });
    page.next({
      '@id': '/api/organizations/org/maintenance-exports?page=3',
      '@type': 'Collection',
      member: [lastArchive],
      totalItems: 61,
    });
    expect(store.exportEntities()).toEqual([lastArchive]);
    expect(store.listCallState().status).toBe('success');
    expect(store.total()).toBe(61);
    expect(store.pageCount()).toBe(3);
    api['list']?.mockReturnValueOnce(of({ member: [], totalItems: 0 }));
    store.load({ page: 1 });
    expect(store.exportEntities()).toEqual([]);
    expect(store.pageCount()).toBe(1);
  });

  it('exposes a failed archive page as a normalized error instead of a successful empty list', () => {
    setup();
    store.load({ page: 1 });
    api['list']?.mockReturnValueOnce(
      throwError(() => ({
        type: 'about:blank',
        status: 503,
        title: 'Unavailable',
        detail: 'Archive page unavailable.',
      })),
    );
    store.load({ page: 2 });
    expect(store.listCallState()).toMatchObject({
      status: 'error',
      data: null,
      error: { code: 503, message: 'Archive page unavailable.' },
    });
    expect(store.exportEntities()).toEqual([]);
  });

  it('retains the selected archive during its refresh and a normalized refresh failure', () => {
    setup();
    store.read(archive.id);
    const refresh = new Subject<MaintenanceExportOutput>();
    api['read']?.mockReturnValueOnce(refresh);
    store.read(archive.id);
    expect(store.detailCallState()).toMatchObject({ status: 'pending', data: archive });
    refresh.error({
      type: 'about:blank',
      status: 503,
      title: 'Unavailable',
      detail: 'Archive refresh unavailable.',
    });
    expect(store.detailCallState()).toMatchObject({
      status: 'error',
      data: archive,
      error: { code: 503, message: 'Archive refresh unavailable.' },
    });
    expect(store.selectedId()).toBe(archive.id);
  });

  it('discards previous detail when selecting another archive and ignores a foreign organization reply', () => {
    setup();
    store.read(archive.id);
    const detail = new Subject<MaintenanceExportOutput>();
    api['read']?.mockReturnValueOnce(detail);
    store.read('another-export');
    expect(store.detailCallState()).toMatchObject({ status: 'pending', data: null });
    detail.next(maintenanceExportFixture({ id: 'another-export', organizationId: 'other' }));
    expect(store.detailCallState().data).toBeNull();
    store.read(null);
    expect(detail.observed).toBe(false);
    expect(store.selectedId()).toBeNull();
    expect(store.detailCallState().status).toBe('idle');
  });

  it('loads published source choices with their server readiness and exact search page', () => {
    setup();
    const sources = new Subject<HydraCollection<MaintenanceExportSourceOutput>>();
    api['listSources']?.mockReturnValueOnce(sources);
    store.loadSources({ page: 2, search: 'published' });
    expect(api['listSources']).toHaveBeenLastCalledWith('org', {
      page: 2,
      search: 'published',
      itemsPerPage: 30,
    });
    expect(store.sourcesCallState().status).toBe('pending');
    const source: MaintenanceExportSourceOutput = {
      '@id': '/api/organizations/org/maintenance-export-sources/dossier-1',
      '@type': 'MaintenanceExportSource',
      id: 'dossier-1',
      number: 17,
      name: 'Published maintenance',
      type: 'maintenance',
      publishedAt: '2026-10-07T12:00:00Z',
      snapshotState: 'retained',
      identityComplete: true,
      ready: true,
    };
    const collection: HydraCollection<MaintenanceExportSourceOutput> = {
      '@id': '/api/organizations/org/maintenance-export-sources?page=2',
      '@type': 'Collection',
      member: [source],
      totalItems: 31,
    };
    sources.next(collection);
    expect(store.sourcesCallState()).toMatchObject({ status: 'success', data: collection });
    store.loadSources(null);
    expect(sources.observed).toBe(false);
    expect(store.sourcesCallState()).toMatchObject({ status: 'idle', data: null });
  });

  it('exposes source selection failure independently from previously loaded archives', () => {
    setup();
    store.load({ page: 1 });
    api['listSources']?.mockReturnValueOnce(
      throwError(() => ({
        type: 'about:blank',
        status: 403,
        title: 'Forbidden',
        detail: 'Source selection denied.',
      })),
    );
    store.loadSources({ page: 1 });
    expect(store.sourcesCallState()).toMatchObject({
      status: 'error',
      data: null,
      error: { code: 403, message: 'Source selection denied.' },
    });
    expect(store.exportEntities()).toEqual([archive]);
    expect(store.listCallState().status).toBe('success');
  });

  it('loads and resets a filtered external-reference page independently from archive detail', () => {
    setup();
    store.read(archive.id);
    const references = new Subject<HydraCollection<MaintenanceExportReferenceOutput>>();
    api['listReferences']?.mockReturnValueOnce(references);
    store.loadReferences({ page: 2, system: 'ERP' });
    expect(api['listReferences']).toHaveBeenLastCalledWith('org', {
      page: 2,
      itemsPerPage: 30,
      params: { system: 'ERP' },
    });
    expect(store.referencesCallState().status).toBe('pending');
    const collection: HydraCollection<MaintenanceExportReferenceOutput> = {
      '@id': '/api/organizations/org/maintenance-export-references?page=2',
      '@type': 'Collection',
      member: [mapping],
      totalItems: 31,
    };
    references.next(collection);
    expect(store.referencesCallState()).toMatchObject({ status: 'success', data: collection });
    store.loadReferences(null);
    expect(references.observed).toBe(false);
    expect(store.referencesCallState()).toMatchObject({ status: 'idle', data: null });
    expect(store.detailCallState().data).toEqual(archive);
  });

  it('exposes external-reference page failure instead of presenting an absent mapping', () => {
    setup();
    api['listReferences']?.mockReturnValueOnce(
      throwError(() => ({
        type: 'about:blank',
        status: 503,
        title: 'Unavailable',
        detail: 'Reference page unavailable.',
      })),
    );
    store.loadReferences({ page: 1 });
    expect(api['listReferences']).toHaveBeenCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      params: {},
    });
    expect(store.referencesCallState()).toMatchObject({
      status: 'error',
      data: null,
      error: { code: 503, message: 'Reference page unavailable.' },
    });
    expect(store.mappingCallState().status).toBe('idle');
  });

  it('selects the mapping for the exact resource owner and system before clearing that selection', () => {
    setup();
    api['listReferences']?.mockReturnValueOnce(
      of({
        member: [
          { ...mapping, id: 'different-resource', resourceId: 'other-equipment' },
          { ...mapping, id: 'different-owner', resourceType: 'site' },
          { ...mapping, id: 'different-system', system: 'OTHER' },
          mapping,
        ],
        totalItems: 4,
      }),
    );
    const query = { system: 'ERP', resourceType: 'equipment' as const, resourceId: 'equipment' };
    store.readMapping(query);
    expect(api['listReferences']).toHaveBeenCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      params: query,
    });
    expect(store.mappingCallState()).toMatchObject({ status: 'success', data: mapping });
    store.readMapping(null);
    expect(store.mappingCallState()).toMatchObject({ status: 'idle', data: null });
  });

  it('exposes a directory error and resets unavailable owner choices when their read is cleared', () => {
    setup();
    const targets = new Subject<MaintenanceExportReferencePage>();
    directory.list.mockReturnValueOnce(targets);
    store.loadTargets({ resourceType: 'site', page: 1 });
    expect(store.targetsCallState().status).toBe('pending');
    targets.error({
      type: 'about:blank',
      status: 503,
      title: 'Unavailable',
      detail: 'Owner directory unavailable.',
    });
    expect(store.targetsCallState()).toMatchObject({
      status: 'error',
      data: null,
      error: { code: 503, message: 'Owner directory unavailable.' },
    });
    store.loadTargets(null);
    expect(store.targetsCallState()).toMatchObject({ status: 'idle', data: null });
  });

  it('selects a successfully appended adjustment and acknowledges its exact accepted operation', () => {
    setup();
    store.load({ page: 1 });
    store.read(archive.id);
    const accepted = new Subject<MaintenanceExportOutput>();
    api['adjust']?.mockReturnValueOnce(accepted);
    const adjustment = {
      clientOperationId: 'adjust-operation',
      reason: 'Reviewed source correction',
    };
    store.write({
      kind: 'adjust',
      organizationId: 'org',
      exportId: archive.id,
      revision: 1,
      input: adjustment,
    });
    expect(api['adjust']).toHaveBeenCalledWith('org', archive.id, adjustment, 1);
    expect(store.writePending()).toBe(true);
    expect(store.detailCallState().data).toEqual(archive);
    const adjusted = maintenanceExportFixture({
      id: 'adjusted-export',
      kind: 'adjustment',
      adjustmentOf: archive.id,
      originalExportId: archive.id,
    });
    accepted.next(adjusted);
    expect(store.writeCallState()).toMatchObject({ status: 'success', data: adjusted });
    expect(store.detailCallState().data).toEqual(adjusted);
    expect(store.selectedId()).toBe(adjusted.id);
    expect(store.command()).toBeNull();
    expect(store.exportEntities()).toEqual([archive]);
    expect(dispatcher.dispatch).toHaveBeenCalledExactlyOnceWith(
      maintenanceExportStoreEvents.acknowledged({ ...scope, kind: 'adjust', id: adjusted.id }),
    );
  });

  it('acknowledges an external import using confirm permission without an export-management grant', () => {
    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM,
    ]);
    setup();
    store.read(archive.id);
    const confirmation = {
      clientOperationId: 'confirm-operation',
      externalImportReference: 'IMPORT-9',
    };
    const confirmed = maintenanceExportFixture({ state: 'import_confirmed', revision: 2 });
    api['confirm']?.mockReturnValueOnce(of(confirmed));
    store.write({
      kind: 'confirm',
      organizationId: 'org',
      exportId: archive.id,
      revision: 1,
      input: confirmation,
    });
    expect(api['confirm']).toHaveBeenCalledWith('org', archive.id, confirmation, 1);
    expect(store.writeCallState()).toMatchObject({ status: 'success', data: confirmed });
    expect(store.detailCallState().data).toEqual(confirmed);
    expect(store.command()).toBeNull();
    expect(dispatcher.dispatch).toHaveBeenCalledExactlyOnceWith(
      maintenanceExportStoreEvents.acknowledged({ ...scope, kind: 'confirm', id: archive.id }),
    );
  });

  it('updates the reviewed external mapping after a successful write without replacing archive detail', () => {
    setup();
    store.read(archive.id);
    const reference = {
      clientOperationId: 'reference-operation',
      system: 'ERP',
      reference: 'EXT-EQUIPMENT',
    };
    api['writeReference']?.mockReturnValueOnce(of(mapping));
    store.write({
      kind: 'reference',
      organizationId: 'org',
      resourceType: 'equipment',
      resourceId: 'equipment',
      revision: 1,
      input: reference,
    });
    expect(api['writeReference']).toHaveBeenCalledWith(
      'org',
      'equipment',
      'equipment',
      reference,
      1,
    );
    expect(store.writeCallState()).toMatchObject({ status: 'success', data: mapping });
    expect(store.mappingCallState()).toMatchObject({ status: 'success', data: mapping });
    expect(store.detailCallState().data).toEqual(archive);
    expect(store.selectedId()).toBe(archive.id);
    expect(store.command()).toBeNull();
    expect(dispatcher.dispatch).toHaveBeenCalledExactlyOnceWith(
      maintenanceExportStoreEvents.acknowledged({ ...scope, kind: 'reference', id: mapping.id }),
    );
  });

  it('rejects a successful write receipt belonging to another organization without emitting acknowledgement', () => {
    setup();
    api['create']?.mockReturnValueOnce(of(maintenanceExportFixture({ organizationId: 'other' })));
    store.write({ kind: 'create', organizationId: 'org', input });
    expect(store.writeCallState()).toMatchObject({ status: 'idle', data: null });
    expect(store.detailCallState().data).toBeNull();
    expect(store.command()).toBeNull();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('keeps an accepted command fenced until a late failure releases the write in the new organization', () => {
    setup();
    const accepted = new Subject<MaintenanceExportOutput>();
    api['create']?.mockReturnValueOnce(accepted);
    store.write({ kind: 'create', organizationId: 'org', input });
    store.clearCommand();
    expect(store.writePending()).toBe(true);
    expect(store.command()).toEqual({ kind: 'create', organizationId: 'org', input });
    store.setScope({ ...scope, organizationId: 'other' });
    store.write({ kind: 'create', organizationId: 'other', input });
    expect(api['create']).toHaveBeenCalledTimes(1);
    accepted.error({
      type: 'about:blank',
      status: 503,
      title: 'Unavailable',
      detail: 'Late write failure.',
    });
    expect(store.writeCallState()).toMatchObject({ status: 'idle', data: null, error: null });
    expect(store.command()).toBeNull();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('preserves a retryable command on editor reset and allows explicit reset after a confirmed conflict', () => {
    setup();
    api['create']
      ?.mockReturnValueOnce(
        throwError(() => ({
          type: 'about:blank',
          status: 503,
          title: 'Unavailable',
          detail: 'Receipt unavailable.',
        })),
      )
      .mockReturnValueOnce(
        throwError(() => ({
          type: 'about:blank',
          status: 409,
          title: 'Conflict',
          detail: 'Review the selected sources.',
        })),
      );
    store.write({ kind: 'create', organizationId: 'org', input });
    expect(store.uncertainWrite()).toBe(true);
    store.clearCommand();
    expect(store.command()).toEqual({ kind: 'create', organizationId: 'org', input });
    expect(store.writeCallState().status).toBe('error');
    store.write({ kind: 'create', organizationId: 'org', input });
    expect(store.uncertainWrite()).toBe(false);
    store.clearCommand();
    expect(store.command()).toBeNull();
    expect(store.writeCallState()).toMatchObject({ status: 'idle', data: null, error: null });
  });

  it('blocks adjustment and confirmation of a retained financial archive after financial read is denied', () => {
    setup();
    api['read']?.mockReturnValueOnce(of(maintenanceExportFixture({ includeInternalCosts: true })));
    store.read(archive.id);
    store.write({
      kind: 'adjust',
      organizationId: 'org',
      exportId: archive.id,
      revision: 1,
      input: { clientOperationId: 'financial-adjustment', reason: 'Reviewed correction' },
    });
    store.write({
      kind: 'confirm',
      organizationId: 'org',
      exportId: archive.id,
      revision: 1,
      input: { clientOperationId: 'financial-confirmation', externalImportReference: 'IMPORT-1' },
    });
    expect(api['adjust']).not.toHaveBeenCalled();
    expect(api['confirm']).not.toHaveBeenCalled();
    expect(store.writeCallState().status).toBe('idle');
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('rejects commands outside the active organization or without the independent management grant', () => {
    setup();
    store.write({ kind: 'create', organizationId: 'other', input });
    expect(api['create']).not.toHaveBeenCalled();
    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM,
    ]);
    store.write({ kind: 'create', organizationId: 'org', input });
    store.write({
      kind: 'reference',
      organizationId: 'org',
      resourceType: 'equipment',
      resourceId: 'equipment',
      revision: 0,
      input: { clientOperationId: 'denied-reference', system: 'ERP', reference: 'EXT-EQUIPMENT' },
    });
    expect(api['create']).not.toHaveBeenCalled();
    expect(api['writeReference']).not.toHaveBeenCalled();
    expect(store.writeCallState().status).toBe('idle');
  });

  it('retains the actual downloaded bytes until the browser consumer explicitly clears them', () => {
    setup();
    const download = new Subject<Blob>();
    api['download']?.mockReturnValueOnce(download);
    store.download({ exportId: archive.id, format: 'csv', includeInternalCosts: false });
    expect(api['download']).toHaveBeenCalledWith('org', archive.id, 'csv');
    expect(store.downloadCallState().status).toBe('pending');
    const bytes = new Blob(['retained server bytes'], { type: 'text/csv' });
    download.next(bytes);
    expect(store.downloadCallState().status).toBe('success');
    expect(store.downloadCallState().data).toBe(bytes);
    store.clearDownload();
    expect(store.downloadCallState()).toMatchObject({ status: 'idle', data: null, error: null });
    expect(store.detailCallState().data).toBeNull();
  });

  it('normalizes a download failure and allows a subsequent successful retry', () => {
    setup();
    api['download']?.mockReturnValueOnce(
      throwError(() => ({
        type: 'about:blank',
        status: 404,
        title: 'Not found',
        detail: 'Retained file unavailable.',
      })),
    );
    const query = { exportId: archive.id, format: 'json' as const, includeInternalCosts: false };
    store.download(query);
    expect(store.downloadCallState()).toMatchObject({
      status: 'error',
      data: null,
      error: { code: 404, message: 'Retained file unavailable.' },
    });
    store.download(query);
    expect(store.downloadCallState().status).toBe('success');
    expect(store.downloadCallState().error).toBeNull();
  });

  it('preserves an in-flight detail and loaded archive page when the same scope is supplied again', () => {
    setup();
    store.load({ page: 1 });
    const detail = new Subject<MaintenanceExportOutput>();
    api['read']?.mockReturnValueOnce(detail);
    store.read(archive.id);
    const generation = store.generation();
    store.setScope({ ...scope });
    expect(store.generation()).toBe(generation);
    expect(detail.observed).toBe(true);
    expect(store.exportEntities()).toEqual([archive]);
    detail.next(archive);
    expect(store.detailCallState()).toMatchObject({ status: 'success', data: archive });
  });
});
