import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentTypeCatalogStore } from '@features/organization/features/equipments';
import { EquipmentTypeService } from '@features/organization/features/equipments/data-access';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionEquipmentCatalogSnapshot,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionEquipmentCatalogService } from '@features/organization/features/interventions/services/intervention-equipment-catalog';
import { InterventionInventoryService } from '@features/organization/features/interventions/services/intervention-inventory';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { InterventionWorkspaceStore } from '../intervention-workspace.store';

describe('InterventionWorkspaceStore', () => {
  const owner = signal('account');
  const organization = signal('org-1');
  const allowed = signal(true);
  const visibleTypes = signal<readonly EquipmentTypeOutput[]>([]);
  const type: EquipmentTypeOutput = {
    '@id': '/api/organizations/org-1/equipment-types/foam_station',
    '@type': 'EquipmentType',
    value: 'foam_station',
    label: 'Archived foam station',
    archived: true,
    family: 'fire',
    revision: 2,
  };
  const equipmentCatalog: InterventionEquipmentCatalogSnapshot = {
    version: 1,
    accountId: 'account',
    organizationId: 'org-1',
    entries: [type],
    capturedAt: '2026-10-06T10:00:00Z',
  };
  const intervention = {
    id: 'intervention',
    organization: '/api/organizations/org-1',
  } as InterventionOutput;
  const saved = { intervention, workItems: [], changes: [], issues: [], equipmentCatalog };
  const offline = {
    publicationOwner: () => owner(),
    getWorkspace: vi.fn(),
    listOutbox: vi.fn(),
    saveWorkspace: vi.fn(),
    saveEquipmentCatalog: vi.fn(),
  };
  const catalog = { listAll: vi.fn() };
  const target = { seed: vi.fn(), clear: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    owner.set('account');
    organization.set('org-1');
    allowed.set(true);
    visibleTypes.set([]);
    offline.getWorkspace.mockResolvedValue(saved);
    offline.listOutbox.mockResolvedValue([]);
    target.seed.mockImplementation((_org: string, entries: readonly EquipmentTypeOutput[]) =>
      visibleTypes.set(entries),
    );
    target.clear.mockImplementation(() => visibleTypes.set([]));
    TestBed.configureTestingModule({
      providers: [
        InterventionWorkspaceStore,
        { provide: InterventionInventoryService, useValue: { capture: () => of(null) } },
        InterventionEquipmentCatalogService,
        { provide: EquipmentTypeCatalogStore, useValue: target },
        { provide: EquipmentTypeService, useValue: catalog },
        { provide: InterventionOfflineService, useValue: offline },
        {
          provide: InterventionService,
          useValue: {
            get: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 }))),
            listAllWorkItems: () => of([]),
            listAllChanges: () => of([]),
            listIssues: () => of({ member: [] }),
          },
        },
        { provide: FacilityService, useValue: {} },
        { provide: ConnectivityService, useValue: { isNetworkFailure: () => true } },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: signal(true), sessionRevision: signal(1) },
        },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganizationId: organization } },
        {
          provide: OrganizationPermissionService,
          useValue: {
            isLoadingPermissions: signal(false),
            permissionError: () => null,
            hasPermission: () => allowed(),
          },
        },
      ],
    });
  });

  it('restores the offline catalog and clears visible labels reactively on permission revocation and account changes', async () => {
    const store = TestBed.inject(InterventionWorkspaceStore);
    store.load('intervention');
    await vi.waitFor(() => expect(store.servedFromLocalCache()).toBe(true));
    TestBed.inject(ApplicationRef).tick();
    expect(visibleTypes()).toEqual([type]);
    expect(catalog.listAll).not.toHaveBeenCalled();
    expect(offline.saveWorkspace).not.toHaveBeenCalled();
    allowed.set(false);
    TestBed.inject(ApplicationRef).tick();
    expect(visibleTypes()).toEqual([]);
    allowed.set(true);
    TestBed.inject(ApplicationRef).tick();
    expect(visibleTypes()).toEqual([type]);
    owner.set('other-account');
    TestBed.inject(ApplicationRef).tick();
    expect(visibleTypes()).toEqual([]);
  });

  it('keeps legacy snapshots compatible and clears a catalog when the organization context changes', async () => {
    const store = TestBed.inject(InterventionWorkspaceStore);
    store.load('intervention');
    await vi.waitFor(() => expect(store.servedFromLocalCache()).toBe(true));
    TestBed.inject(ApplicationRef).tick();
    expect(visibleTypes()).toEqual([type]);
    organization.set('org-2');
    TestBed.inject(ApplicationRef).tick();
    expect(visibleTypes()).toEqual([]);
    organization.set('org-1');
    offline.getWorkspace.mockResolvedValue({ ...saved, equipmentCatalog: undefined });
    store.reload('intervention');
    await vi.waitFor(() => expect(store.equipmentCatalogSnapshot()).toBeNull());
    TestBed.inject(ApplicationRef).tick();
    expect(visibleTypes()).toEqual([]);
    expect(store.workItems()).toEqual([]);
  });
});
