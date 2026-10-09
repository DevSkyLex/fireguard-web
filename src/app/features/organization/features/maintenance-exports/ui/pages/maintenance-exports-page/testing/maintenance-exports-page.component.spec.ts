import { getDebugNode, PLATFORM_ID, signal, type DebugElement } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { of, Subject } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ConnectivityService } from '@core/connectivity';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { THEME_PORT } from '@core/theme';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { MaintenanceExportService } from '@features/organization/features/maintenance-exports/data-access';
import type {
  MaintenanceExportReferenceOutput,
  MaintenanceExportSourceOutput,
} from '@features/organization/features/maintenance-exports/models';
import { maintenanceExportFixture } from '@features/organization/features/maintenance-exports/models/export/testing/maintenance-export.fixture';
import {
  MaintenanceExportStore,
  maintenanceExportStoreEvents,
  type MaintenanceExportStoreType,
} from '@features/organization/features/maintenance-exports/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { MaintenanceExportActionForm } from '../../../forms/maintenance-export-action-form';
import { MaintenanceExportCreateForm } from '../../../forms/maintenance-export-create-form';
import { MaintenanceExportReferenceForm } from '../../../forms/maintenance-export-reference-form';
import { MaintenanceExportsPage } from '../maintenance-exports-page.component';

const failure = (status: number, detail: string) =>
  toStoreError({ type: 'about:blank', status, title: 'Request rejected', detail });
const button = (label: string): HTMLButtonElement => {
  const match = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (item) => item.textContent?.trim() === label,
  );
  if (!match) throw new Error(`Button ${label} is not rendered`);
  return match;
};
const child = <T>(selector: string): T => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Child ${selector} is not rendered`);
  return (getDebugNode(element) as DebugElement).componentInstance as T;
};
const createForm = (): MaintenanceExportCreateForm => child('app-maintenance-export-create-form');
const actionForm = (): MaintenanceExportActionForm => child('app-maintenance-export-action-form');
const referenceForm = (): MaintenanceExportReferenceForm =>
  child('app-maintenance-export-reference-form');

describe('MaintenanceExportsPage', () => {
  let fixture: ComponentFixture<MaintenanceExportsPage>,
    api: Record<string, ReturnType<typeof vi.fn>>;
  const authenticated = signal(true),
    sessionRevision = signal(1),
    online = signal(true),
    grants = signal<readonly string[]>([]);
  const archive = maintenanceExportFixture();
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setup = async (platform = 'browser'): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [MaintenanceExportsPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: MaintenanceExportService, useValue: api },
        { provide: CustomerService, useValue: { list: vi.fn() } },
        { provide: FacilityService, useValue: { list: vi.fn() } },
        { provide: EquipmentService, useValue: { list: vi.fn() } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision },
        },
        { provide: ConnectivityService, useValue: { isOnline: online } },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone: 'UTC' }) },
        },
        { provide: BrowserDownloadService, useValue: { trigger: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(MaintenanceExportsPage);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('exportId', archive.id);
    await fixture.whenStable();
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => {
    authenticated.set(true);
    sessionRevision.set(1);
    online.set(true);
    grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ]);
    api = {
      list: vi.fn().mockReturnValue(of({ member: [archive], totalItems: 1 })),
      read: vi.fn().mockReturnValue(of(archive)),
      listReferences: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      listSources: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      download: vi.fn().mockReturnValue(of(new Blob(['retained']))),
    };
  });
  it.each(['server', 'anonymous', 'no-read'])(
    'performs zero private calls and renders no archive identity in %s',
    async (mode) => {
      if (mode === 'anonymous') authenticated.set(false);
      if (mode === 'no-read') grants.set([]);
      await setup(mode === 'server' ? 'server' : 'browser');
      expect(api['list']).not.toHaveBeenCalled();
      expect(api['read']).not.toHaveBeenCalled();
      expect(api['listReferences']).not.toHaveBeenCalled();
      expect(root().querySelector('[data-testid=maintenance-export-detail]')).toBeNull();
    },
  );
  it('distinguishes a generated archive from an actually confirmed import in a read-only workspace', async () => {
    await setup();
    expect(root().textContent).toContain('No external import has been confirmed');
    expect(root().querySelector('[data-testid=maintenance-export-create]')).toBeNull();
    expect(root().textContent).toContain('Download retained JSON');
    expect(root().textContent).not.toContain('Confirm external import');
  });
  it('shows the actual import reference and keeps adjustments linked to their predecessor', async () => {
    api['read']?.mockReturnValue(
      of(
        maintenanceExportFixture({
          kind: 'adjustment',
          adjustmentOf: 'original',
          originalExportId: 'original',
          state: 'import_confirmed',
          confirmation: {
            clientOperationId: 'ack',
            externalImportReference: 'ERP-IMPORT-42',
            confirmedAt: '2026-10-07T12:01:00Z',
            actorId: 'member',
          },
        }),
      ),
    );
    await setup();
    expect(root().textContent).toContain('ERP-IMPORT-42');
    expect(root().textContent).toContain('Open corrected export');
    expect(root().textContent).not.toContain('No external import has been confirmed');
  });
  it('does not make source picker reads until the creation sheet is explicitly opened', async () => {
    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE]);
    await setup();
    expect(api['listSources']).not.toHaveBeenCalled();
    root().querySelector<HTMLButtonElement>('[data-testid=maintenance-export-create]')?.click();
    await fixture.whenStable();
    expect(api['listSources']).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Generate a prestation export');
  });
  it('clears archive identities on account replacement and reloads within the new session', async () => {
    await setup();
    sessionRevision.set(2);
    api['list']?.mockReturnValue(of({ member: [], totalItems: 0 }));
    api['read']?.mockReturnValue(
      of(
        maintenanceExportFixture({
          id: 'new-session-archive',
          files: { ...archive.files, json: { ...archive.files.json, sha256: 'new-session-hash' } },
        }),
      ),
    );
    await fixture.whenStable();
    expect(root().textContent).not.toContain('original-json-hash');
    expect(api['list']).toHaveBeenCalledTimes(2);
  });

  describe('command orchestration', () => {
    const createStore = () => {
      const command = signal<ReturnType<MaintenanceExportStoreType['command']>>(null);
      const writeCallState =
        signal<ReturnType<MaintenanceExportStoreType['writeCallState']>>(idleCallState());
      return {
        scope: signal({ organizationId: 'org', sessionRevision: 1 }),
        selectedId: signal<string | null>(archive.id),
        page: signal(3),
        pageCount: signal(4),
        exportEntities: signal([archive]),
        listCallState: signal<ReturnType<MaintenanceExportStoreType['listCallState']>>(
          successCallState(null),
        ),
        detailCallState: signal<ReturnType<MaintenanceExportStoreType['detailCallState']>>(
          successCallState(maintenanceExportFixture({ revision: 7 })),
        ),
        sourcesCallState: signal<ReturnType<MaintenanceExportStoreType['sourcesCallState']>>(
          successCallState<HydraCollection<MaintenanceExportSourceOutput>>({
            '@id': '/api/organizations/org/maintenance-export-sources',
            '@type': 'Collection',
            member: [],
            totalItems: 0,
          }),
        ),
        referencesCallState: signal<ReturnType<MaintenanceExportStoreType['referencesCallState']>>(
          successCallState<HydraCollection<MaintenanceExportReferenceOutput>>({
            '@id': '/api/organizations/org/maintenance-export-references',
            '@type': 'Collection',
            member: [],
            totalItems: 0,
          }),
        ),
        targetsCallState: signal<ReturnType<MaintenanceExportStoreType['targetsCallState']>>(
          successCallState({ member: [], totalItems: 0 }),
        ),
        mappingCallState:
          signal<ReturnType<MaintenanceExportStoreType['mappingCallState']>>(idleCallState()),
        writeCallState,
        downloadCallState:
          signal<ReturnType<MaintenanceExportStoreType['downloadCallState']>>(idleCallState()),
        command,
        writePending: signal(false),
        uncertainWrite: signal(false),
        setScope: vi.fn(),
        load: vi.fn(),
        read: vi.fn(),
        loadSources: vi.fn(),
        loadReferences: vi.fn(),
        loadTargets: vi.fn(),
        readMapping: vi.fn(),
        write: vi.fn(),
        download: vi.fn(),
        clearDownload: vi.fn(),
        clearCommand: vi.fn().mockImplementation(() => {
          command.set(null);
          writeCallState.set(idleCallState());
        }),
      };
    };
    let store: ReturnType<typeof createStore>;
    let acknowledged: Subject<ReturnType<typeof maintenanceExportStoreEvents.acknowledged>>;
    let trigger: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.fn>;
    const operationId = '54be8e08-ef40-42d7-bb2c-d719ad660b86';
    const commandInput = {
      interventionIds: ['published-dossier'],
      system: 'ERP',
      includeInternalCosts: false,
    };
    const setupPage = async (): Promise<void> => {
      TestBed.configureTestingModule({
        imports: [MaintenanceExportsPage],
        providers: [
          provideRouter([]),
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: Events, useValue: { on: vi.fn().mockReturnValue(acknowledged) } },
          {
            provide: OrganizationPermissionService,
            useValue: { hasPermission: (permission: string) => grants().includes(permission) },
          },
          {
            provide: AUTH_SESSION_PORT,
            useValue: { isAuthenticated: authenticated, sessionRevision },
          },
          { provide: ConnectivityService, useValue: { isOnline: online } },
          { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
          {
            provide: REGIONAL_FORMATTING_PORT,
            useValue: { regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone: 'UTC' }) },
          },
          { provide: BrowserDownloadService, useValue: { trigger } },
        ],
      })
        .overrideComponent(MaintenanceExportsPage, {
          set: { providers: [{ provide: MaintenanceExportStore, useValue: store }] },
        })
        .overrideComponent(MaintenanceExportCreateForm, { set: { template: '' } })
        .overrideComponent(MaintenanceExportActionForm, { set: { template: '' } })
        .overrideComponent(MaintenanceExportReferenceForm, { set: { template: '' } });
      navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      fixture = TestBed.createComponent(MaintenanceExportsPage);
      fixture.componentRef.setInput('organizationId', 'org');
      fixture.componentRef.setInput('exportId', archive.id);
      await fixture.whenStable();
    };
    beforeEach(() => {
      grants.set([
        ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
        ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE,
        ORGANIZATION_PERMISSION.CUSTOMERS_READ,
      ]);
      store = createStore();
      acknowledged = new Subject();
      trigger = vi.fn();
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(operationId);
    });
    afterEach(() => vi.restoreAllMocks());

    it('forwards a validated creation intent with one generated operation UUID', async () => {
      await setupPage();
      expect(store.loadSources).not.toHaveBeenCalled();
      button('Generate export').click();
      await fixture.whenStable();
      expect(store.loadSources).toHaveBeenCalledExactlyOnceWith({ page: 1 });
      createForm().submitted.emit(commandInput);
      expect(store.write).toHaveBeenCalledExactlyOnceWith({
        kind: 'create',
        organizationId: 'org',
        input: { ...commandInput, clientOperationId: operationId },
      });
    });

    it('forwards archive query changes and clearing without refetching the organization collection', async () => {
      await setupPage();
      expect(store.setScope).toHaveBeenCalledExactlyOnceWith({
        organizationId: 'org',
        sessionRevision: 1,
      });
      store.load.mockClear();
      store.loadReferences.mockClear();
      store.read.mockClear();
      fixture.componentRef.setInput('exportId', 'other-archive');
      await fixture.whenStable();
      expect(store.read).toHaveBeenCalledExactlyOnceWith('other-archive');
      fixture.componentRef.setInput('exportId', undefined);
      await fixture.whenStable();
      expect(store.read.mock.calls).toEqual([['other-archive'], [null]]);
      expect(store.load).not.toHaveBeenCalled();
      expect(store.loadReferences).not.toHaveBeenCalled();
    });

    it('projects each owner directory grant independently into the reference picker', async () => {
      grants.set([
        ...grants(),
        ORGANIZATION_PERMISSION.FACILITIES_READ,
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ]);
      await setupPage();
      button('Map a reference').click();
      await fixture.whenStable();
      expect(referenceForm().allowedTypes()).toEqual(['customer', 'site', 'equipment']);
      grants.set(grants().filter((grant) => grant !== ORGANIZATION_PERMISSION.FACILITIES_READ));
      await fixture.whenStable();
      expect(referenceForm().allowedTypes()).toEqual(['customer', 'equipment']);
      grants.set([
        ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
        ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE,
      ]);
      await fixture.whenStable();
      expect(referenceForm().allowedTypes()).toEqual([]);
    });

    it('retains the committed dossier search when the child changes only its page', async () => {
      await setupPage();
      button('Generate export').click();
      await fixture.whenStable();
      createForm().searchChanged.emit('published operator');
      createForm().pageChanged.emit(3);
      expect(store.loadSources.mock.calls.slice(-2)).toEqual([
        [{ page: 1, search: 'published operator' }],
        [{ page: 3, search: 'published operator' }],
      ]);
      await fixture.whenStable();
      expect(createForm().sourcePage()).toBe(3);
    });

    it.each(['adjust', 'confirm'] as const)(
      'submits %s at the displayed archive revision with an explicit operator value',
      async (kind) => {
        if (kind === 'confirm')
          grants.set([
            ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ,
            ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM,
          ]);
        await setupPage();
        button(kind === 'confirm' ? 'Confirm external import' : 'Append adjustment').click();
        await fixture.whenStable();
        expect(actionForm().confirmation()).toBe(kind === 'confirm');
        actionForm().submitted.emit('Reviewed ERP import');
        expect(store.write).toHaveBeenCalledExactlyOnceWith({
          kind,
          organizationId: 'org',
          exportId: archive.id,
          revision: 7,
          input:
            kind === 'confirm'
              ? { clientOperationId: operationId, externalImportReference: 'Reviewed ERP import' }
              : { clientOperationId: operationId, reason: 'Reviewed ERP import' },
        });
        if (kind === 'confirm')
          expect(root().querySelector('[data-testid=maintenance-export-create]')).toBeNull();
        else expect(root().textContent).not.toContain('Confirm external import');
      },
    );

    it('keeps the confirmation intent and draft when confirm permission is revoked while management remains', async () => {
      grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM]);
      await setupPage();
      button('Confirm external import').click();
      await fixture.whenStable();
      const form = actionForm();
      form.dirtyChanged.emit(true);
      grants.set(
        grants().filter((grant) => grant !== ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM),
      );
      await fixture.whenStable();
      form.submitted.emit('Actual ERP import reference');
      expect(store.write).not.toHaveBeenCalled();
      expect(actionForm()).toBe(form);
      expect(form.confirmation()).toBe(true);
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
      grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM]);
      await fixture.whenStable();
      form.submitted.emit('Actual ERP import reference');
      expect(store.write).toHaveBeenCalledExactlyOnceWith({
        kind: 'confirm',
        organizationId: 'org',
        exportId: archive.id,
        revision: 7,
        input: {
          clientOperationId: operationId,
          externalImportReference: 'Actual ERP import reference',
        },
      });
    });

    it('passes the owner directory query and reviewed mapping tuple without losing the revision', async () => {
      await setupPage();
      button('Map a reference').click();
      await fixture.whenStable();
      expect(referenceForm().allowedTypes()).toEqual(['customer']);
      const query = {
        resourceType: 'customer' as const,
        page: 3,
        search: 'historical operator',
        archived: true,
      };
      referenceForm().targetQueryChanged.emit(query);
      const mapping = { resourceType: 'customer' as const, resourceId: 'customer', system: 'ERP' };
      referenceForm().mappingQueryChanged.emit(mapping);
      referenceForm().submitted.emit({ ...mapping, reference: 'ERP-CUSTOMER', revision: 6 });
      expect(store.loadTargets).toHaveBeenLastCalledWith(query);
      expect(store.readMapping).toHaveBeenLastCalledWith(mapping);
      expect(store.write).toHaveBeenCalledExactlyOnceWith({
        kind: 'reference',
        organizationId: 'org',
        resourceType: 'customer',
        resourceId: 'customer',
        revision: 6,
        input: { clientOperationId: operationId, system: 'ERP', reference: 'ERP-CUSTOMER' },
      });
      await fixture.whenStable();
      expect(referenceForm().targetPage()).toBe(3);
    });

    it.each(['pending', 'uncertain', 'offline'] as const)(
      'locks the open draft and refuses a second intent while %s',
      async (condition) => {
        await setupPage();
        button('Generate export').click();
        await fixture.whenStable();
        if (condition === 'pending') store.writePending.set(true);
        if (condition === 'uncertain') store.uncertainWrite.set(true);
        if (condition === 'offline') online.set(false);
        await fixture.whenStable();
        expect(button('Generate export').disabled).toBe(true);
        expect(createForm().locked()).toBe(true);
        expect(createForm().pending()).toBe(condition === 'pending');
        createForm().submitted.emit(commandInput);
        createForm().cancelled.emit();
        await fixture.whenStable();
        expect(store.write).not.toHaveBeenCalled();
        expect(document.querySelector('app-maintenance-export-create-form')).not.toBeNull();
        if (condition !== 'offline') {
          expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
          await expect(fixture.componentInstance.confirmDeactivation()).resolves.toBe(false);
        }
      },
    );

    it('recovers the retained uncertain command without generating another operation identity', async () => {
      await setupPage();
      button('Append adjustment').click();
      await fixture.whenStable();
      const command = {
        kind: 'adjust' as const,
        organizationId: 'org',
        exportId: archive.id,
        revision: 7,
        input: { clientOperationId: operationId, reason: 'Reviewed adjustment' },
      };
      store.command.set(command);
      store.uncertainWrite.set(true);
      await fixture.whenStable();
      button('Recover the same operation').click();
      expect(store.write).toHaveBeenCalledExactlyOnceWith(command);
      expect(crypto.randomUUID).not.toHaveBeenCalled();
    });

    it('keeps an adjustment draft through a failed conflict review and adopts only a successful reread', async () => {
      await setupPage();
      button('Append adjustment').click();
      await fixture.whenStable();
      const form = actionForm();
      form.dirtyChanged.emit(true);
      store.writeCallState.set(errorCallState(failure(412, 'Archive changed')));
      await fixture.whenStable();
      form.submitted.emit('Retained reason');
      expect(store.write).not.toHaveBeenCalled();
      expect(button('Use reviewed revision and keep my draft').disabled).toBe(true);
      store.detailCallState.set(pendingCallState(archive));
      button('Load latest source').click();
      expect(store.read).toHaveBeenLastCalledWith(archive.id);
      await fixture.whenStable();
      expect(button('Use reviewed revision and keep my draft').disabled).toBe(true);
      store.detailCallState.set(errorCallState(failure(503, 'Source unavailable'), archive));
      await fixture.whenStable();
      expect(button('Use reviewed revision and keep my draft').disabled).toBe(true);
      store.detailCallState.set(successCallState(maintenanceExportFixture({ revision: 8 })));
      await fixture.whenStable();
      button('Use reviewed revision and keep my draft').click();
      await fixture.whenStable();
      expect(actionForm()).toBe(form);
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
      form.submitted.emit('Retained reason');
      expect(store.write).toHaveBeenCalledExactlyOnceWith({
        kind: 'adjust',
        organizationId: 'org',
        exportId: archive.id,
        revision: 8,
        input: { clientOperationId: operationId, reason: 'Retained reason' },
      });
    });

    it('rereads the selected mapping tuple and preserves its form until a reviewed source succeeds', async () => {
      await setupPage();
      button('Map a reference').click();
      await fixture.whenStable();
      const form = referenceForm();
      const mapping = { resourceType: 'customer' as const, resourceId: 'customer', system: 'ERP' };
      form.mappingQueryChanged.emit(mapping);
      form.dirtyChanged.emit(true);
      store.writeCallState.set(errorCallState(failure(409, 'Mapping changed')));
      store.mappingCallState.set(pendingCallState());
      await fixture.whenStable();
      form.submitted.emit({ ...mapping, reference: 'retained-reference', revision: 0 });
      expect(store.write).not.toHaveBeenCalled();
      button('Load latest source').click();
      expect(store.readMapping).toHaveBeenLastCalledWith(mapping);
      await fixture.whenStable();
      expect(button('Use reviewed revision and keep my draft').disabled).toBe(true);
      store.mappingCallState.set(successCallState(null));
      await fixture.whenStable();
      button('Use reviewed revision and keep my draft').click();
      await fixture.whenStable();
      expect(referenceForm()).toBe(form);
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
      form.submitted.emit({ ...mapping, reference: 'retained-reference', revision: 0 });
      expect(store.write).toHaveBeenCalledExactlyOnceWith({
        kind: 'reference',
        organizationId: 'org',
        resourceType: 'customer',
        resourceId: 'customer',
        revision: 0,
        input: { clientOperationId: operationId, system: 'ERP', reference: 'retained-reference' },
      });
    });

    it('lets the reader keep a dirty draft or explicitly discard it before navigation', async () => {
      await setupPage();
      button('Generate export').click();
      await fixture.whenStable();
      const form = createForm();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
      form.dirtyChanged.emit(true);
      const kept = fixture.componentInstance.confirmDeactivation();
      await fixture.whenStable();
      button('Keep editing').click();
      await expect(kept).resolves.toBe(false);
      await fixture.whenStable();
      expect(createForm()).toBe(form);
      form.cancelled.emit();
      await fixture.whenStable();
      expect(document.body.textContent).toContain('Discard the local draft');
      const discarded = fixture.componentInstance.confirmDeactivation();
      button('Discard draft').click();
      await expect(discarded).resolves.toBe(true);
      await fixture.whenStable();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
      expect(document.querySelector('app-maintenance-export-create-form')).toBeNull();
    });

    it('closes a clean cancelled form without showing the discard decision', async () => {
      await setupPage();
      button('Generate export').click();
      await fixture.whenStable();
      createForm().cancelled.emit();
      await fixture.whenStable();
      expect(document.querySelector('app-maintenance-export-create-form')).toBeNull();
      expect(document.body.textContent).not.toContain('Discard the local draft');
    });

    it.each(['create', 'reference'] as const)(
      'refreshes the current archive page after same-session %s acknowledgement',
      async (kind) => {
        await setupPage();
        button(kind === 'create' ? 'Generate export' : 'Map a reference').click();
        await fixture.whenStable();
        if (kind === 'create') createForm().dirtyChanged.emit(true);
        else referenceForm().dirtyChanged.emit(true);
        store.load.mockClear();
        store.loadReferences.mockClear();
        acknowledged.next(
          maintenanceExportStoreEvents.acknowledged({
            organizationId: 'org',
            sessionRevision: 1,
            kind,
            id: 'acknowledged-archive',
          }),
        );
        await fixture.whenStable();
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
        expect(store.load).toHaveBeenCalledExactlyOnceWith({ page: 3 });
        expect(store.loadReferences).toHaveBeenCalledExactlyOnceWith({ page: 1 });
        expect(document.querySelector('[data-testid=maintenance-export-editor]')).toBeNull();
        if (kind === 'reference') expect(navigate).not.toHaveBeenCalled();
        else
          expect(navigate).toHaveBeenCalledExactlyOnceWith([], {
            relativeTo: fixture.debugElement.injector.get(ActivatedRoute),
            queryParams: { exportId: 'acknowledged-archive' },
            queryParamsHandling: 'merge',
          });
      },
    );

    it.each(['organization', 'session'] as const)(
      'ignores an acknowledgement from another %s and keeps the active draft',
      async (different) => {
        await setupPage();
        button('Generate export').click();
        await fixture.whenStable();
        const form = createForm();
        form.dirtyChanged.emit(true);
        store.load.mockClear();
        store.loadReferences.mockClear();
        acknowledged.next(
          maintenanceExportStoreEvents.acknowledged({
            organizationId: different === 'organization' ? 'other' : 'org',
            sessionRevision: different === 'session' ? 2 : 1,
            kind: 'create',
            id: 'foreign-archive',
          }),
        );
        await fixture.whenStable();
        expect(createForm()).toBe(form);
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
        expect(store.load).not.toHaveBeenCalled();
        expect(store.loadReferences).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
      },
    );

    it.each(['json', 'csv'] as const)(
      'downloads the exact retained %s blob once using the archive schema filename',
      async (format) => {
        await setupPage();
        button(format === 'json' ? 'Download retained JSON' : 'Download retained CSV').click();
        expect(store.download).toHaveBeenCalledExactlyOnceWith({
          exportId: archive.id,
          format,
          includeInternalCosts: false,
        });
        const bytes = new Blob(['server-retained-bytes'], {
          type: archive.files[format].mediaType,
        });
        store.downloadCallState.set(successCallState(bytes));
        await fixture.whenStable();
        expect(trigger).toHaveBeenCalledExactlyOnceWith(
          bytes,
          `fireguard-prestations-${archive.id}-v${archive.schemaVersion}.${format}`,
        );
        expect(store.clearDownload).toHaveBeenCalledTimes(1);
        await fixture.whenStable();
        expect(trigger).toHaveBeenCalledTimes(1);
      },
    );

    it('requires the independent financial grant and disables duplicate retained byte requests', async () => {
      store.detailCallState.set(
        successCallState(maintenanceExportFixture({ includeInternalCosts: true })),
      );
      await setupPage();
      expect(button('Download retained JSON').disabled).toBe(true);
      expect(button('Append adjustment').disabled).toBe(true);
      button('Download retained JSON').click();
      expect(store.download).not.toHaveBeenCalled();
      grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
      await fixture.whenStable();
      expect(button('Download retained JSON').disabled).toBe(false);
      button('Download retained JSON').click();
      expect(store.download).toHaveBeenCalledExactlyOnceWith({
        exportId: archive.id,
        format: 'json',
        includeInternalCosts: true,
      });
      store.downloadCallState.set(pendingCallState());
      await fixture.whenStable();
      expect(button('Download retained JSON').disabled).toBe(true);
      expect(button('Download retained CSV').disabled).toBe(true);
      button('Download retained CSV').click();
      expect(store.download).toHaveBeenCalledTimes(1);
    });
  });
});
