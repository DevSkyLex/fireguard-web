import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentTypeService } from '@features/organization/features/equipments/data-access';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionEquipmentCatalogSnapshot,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { InterventionEquipmentCatalogService } from '../intervention-equipment-catalog.service';

const entry: EquipmentTypeOutput = {
  '@id': '/api/organizations/org-1/equipment-types/custom_foam',
  '@type': 'EquipmentType',
  value: 'custom_foam',
  label: 'Retired foam cabinet',
  family: 'fire',
  archived: true,
  revision: 3,
};
const intervention = {
  id: 'intervention',
  organization: '/api/organizations/org-1',
} as InterventionOutput;
const snapshot: InterventionEquipmentCatalogSnapshot = {
  version: 1,
  accountId: 'account',
  organizationId: 'org-1',
  capturedAt: '2026-10-06T10:00:00Z',
  entries: [entry],
};

describe('InterventionEquipmentCatalogService', () => {
  const owner = signal<string | null>('account');
  const organization = signal<string | null>('org-1');
  const authenticated = signal(true);
  const sessionRevision = signal(1);
  const allowed = signal(true);
  const permissionsLoading = signal(false);
  const permissionsError = signal<unknown>(null);
  const catalog = { listAll: vi.fn() };
  const offline = { publicationOwner: () => owner(), saveEquipmentCatalog: vi.fn() };
  const target = { seed: vi.fn(), clear: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    owner.set('account');
    organization.set('org-1');
    authenticated.set(true);
    sessionRevision.set(1);
    allowed.set(true);
    permissionsLoading.set(false);
    permissionsError.set(null);
    catalog.listAll.mockReturnValue(of([entry]));
    offline.saveEquipmentCatalog.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        InterventionEquipmentCatalogService,
        { provide: EquipmentTypeService, useValue: catalog },
        { provide: InterventionOfflineService, useValue: offline },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision },
        },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganizationId: organization } },
        {
          provide: OrganizationPermissionService,
          useValue: {
            isLoadingPermissions: permissionsLoading,
            permissionError: permissionsError,
            hasPermission: () => allowed(),
          },
        },
      ],
    });
  });

  it('captures the complete public catalog including archived labels', async () => {
    const result = await firstValueFrom(
      TestBed.inject(InterventionEquipmentCatalogService).capture(intervention, 'account'),
    );
    expect(catalog.listAll).toHaveBeenCalledExactlyOnceWith('org-1');
    expect(offline.saveEquipmentCatalog).toHaveBeenCalledExactlyOnceWith(
      'intervention',
      'org-1',
      [entry],
      'account',
    );
    expect(result).toMatchObject({
      version: 1,
      accountId: 'account',
      organizationId: 'org-1',
      entries: [entry],
    });
  });

  it('never turns a failed or incomplete catalog read into a saved catalog', async () => {
    catalog.listAll.mockReturnValue(throwError(() => new Error('Second page unavailable')));
    expect(
      await firstValueFrom(
        TestBed.inject(InterventionEquipmentCatalogService).capture(intervention, 'account'),
      ),
    ).toBeNull();
    expect(offline.saveEquipmentCatalog).not.toHaveBeenCalled();
  });

  it.each(['account', 'organization', 'session', 'permission'] as const)(
    'rejects a late read after the %s changes',
    async (scope) => {
      const pending = new Subject<readonly EquipmentTypeOutput[]>();
      catalog.listAll.mockReturnValue(pending);
      const result = firstValueFrom(
        TestBed.inject(InterventionEquipmentCatalogService).capture(intervention, 'account'),
      );
      if (scope === 'account') owner.set('other-account');
      if (scope === 'organization') organization.set('org-2');
      if (scope === 'session') sessionRevision.set(2);
      if (scope === 'permission') allowed.set(false);
      pending.next([entry]);
      pending.complete();
      expect(await result).toBeNull();
      expect(offline.saveEquipmentCatalog).not.toHaveBeenCalled();
    },
  );

  it('restores archived descriptors and applies a newer cached label without reclassifying the code', () => {
    const service = TestBed.inject(InterventionEquipmentCatalogService);
    service.restore(snapshot, target);
    expect(target.seed).toHaveBeenCalledWith('org-1', [entry]);
    const updated = { ...entry, label: 'Archived foam cabinet — building A', revision: 4 };
    service.restore({ ...snapshot, entries: [updated] }, target);
    expect(target.seed).toHaveBeenLastCalledWith('org-1', [updated]);
    expect(updated.value).toBe(entry.value);
  });

  it('clears prior labels for legacy snapshots, changed accounts, organizations and revoked permission', () => {
    const service = TestBed.inject(InterventionEquipmentCatalogService);
    service.restore(undefined, target);
    service.restore({ ...snapshot, accountId: 'other-account' }, target);
    service.restore({ ...snapshot, organizationId: 'org-2' }, target);
    allowed.set(false);
    service.restore(snapshot, target);
    expect(target.clear).toHaveBeenCalledTimes(4);
    expect(target.seed).not.toHaveBeenCalled();
  });

  it('does not read or restore while permissions are being refreshed or failed', async () => {
    const service = TestBed.inject(InterventionEquipmentCatalogService);
    permissionsLoading.set(true);
    service.restore(snapshot, target);
    expect(await firstValueFrom(service.capture(intervention, 'account'))).toBeNull();
    permissionsLoading.set(false);
    permissionsError.set(new Error('Forbidden'));
    service.restore(snapshot, target);
    expect(catalog.listAll).not.toHaveBeenCalled();
    expect(target.seed).not.toHaveBeenCalled();
  });
});
