import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { MaintenanceExportReferenceDirectoryService } from '../maintenance-export-reference-directory.service';

describe('MaintenanceExportReferenceDirectoryService', () => {
  let directory: MaintenanceExportReferenceDirectoryService;
  let customers: { list: ReturnType<typeof vi.fn> };
  let facilities: { list: ReturnType<typeof vi.fn> };
  let equipments: { list: ReturnType<typeof vi.fn> };
  const grants = signal<readonly string[]>([]);

  beforeEach(() => {
    grants.set([]);
    customers = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    facilities = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    equipments = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: CustomerService, useValue: customers },
        { provide: FacilityService, useValue: facilities },
        { provide: EquipmentService, useValue: equipments },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
      ],
    });
    directory = TestBed.inject(MaintenanceExportReferenceDirectoryService);
  });

  it.each(['customer', 'site', 'equipment'] as const)(
    'refuses %s without its independent directory read grant',
    (resourceType) => {
      grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ]);
      expect(directory.list('org', { resourceType, page: 1 })).toBeNull();
      expect(customers.list).not.toHaveBeenCalled();
      expect(facilities.list).not.toHaveBeenCalled();
      expect(equipments.list).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'keeps customer archived=%s paging and excludes contacts',
    async (archived) => {
      grants.set([ORGANIZATION_PERMISSION.CUSTOMERS_READ]);
      customers.list.mockReturnValue(
        of({
          member: [
            { id: 'customer', name: 'Client', archivedAt: '2026-10-07', contacts: ['private'] },
          ],
          totalItems: 61,
        }),
      );
      const request = directory.list('org', {
        resourceType: 'customer',
        page: 3,
        search: 'Client',
        archived,
      });
      if (!request) throw new Error('Expected an authorized customer request');
      expect(await firstValueFrom(request)).toEqual({
        member: [{ id: 'customer', label: 'Client' }],
        totalItems: 61,
      });
      expect(customers.list).toHaveBeenCalledWith('org', {
        page: 3,
        itemsPerPage: 30,
        search: 'Client',
        params: { archived },
      });
      grants.set([]);
      expect(
        directory.list('org', { resourceType: 'customer', page: 1, archived: true }),
      ).toBeNull();
      expect(customers.list).toHaveBeenCalledOnce();
    },
  );

  it('defaults to active customers without changing the owner count', async () => {
    grants.set([ORGANIZATION_PERMISSION.CUSTOMERS_READ]);
    const request = directory.list('org', { resourceType: 'customer', page: 2 });
    if (!request) throw new Error('Expected an authorized customer request');
    expect(await firstValueFrom(request)).toEqual({ member: [], totalItems: 0 });
    expect(customers.list).toHaveBeenCalledWith('org', {
      page: 2,
      itemsPerPage: 30,
      search: undefined,
      params: { archived: false },
    });
  });

  it('browses root sites including archived ones and retains server totals', async () => {
    grants.set([ORGANIZATION_PERMISSION.FACILITIES_READ]);
    facilities.list.mockReturnValue(
      of({
        member: [
          { id: 'site', name: 'Depot', type: 'site' },
          { id: 'building', name: 'Wing', type: 'building' },
        ],
        totalItems: 80,
      }),
    );
    const request = directory.list('org', { resourceType: 'site', page: 2, search: 'Depot' });
    if (!request) throw new Error('Expected an authorized site request');
    expect(await firstValueFrom(request)).toEqual({
      member: [{ id: 'site', label: 'Depot' }],
      totalItems: 80,
    });
    expect(facilities.list).toHaveBeenCalledWith('org', {
      page: 2,
      itemsPerPage: 30,
      search: 'Depot',
      rootsOnly: true,
      includeArchived: true,
    });
  });

  it('preserves equipment identity fallbacks, empty names and authoritative totals', async () => {
    grants.set([ORGANIZATION_PERMISSION.EQUIPMENT_READ]);
    equipments.list.mockReturnValue(
      of({
        member: [
          {
            id: 'named',
            name: 'Extinguisher',
            assetCode: 'asset',
            serialNumber: 'serial',
            type: 'type',
          },
          { id: 'empty', name: '', assetCode: 'asset', serialNumber: 'serial', type: 'type' },
          { id: 'asset', name: null, assetCode: 'asset', serialNumber: 'serial', type: 'type' },
          { id: 'serial', name: null, assetCode: null, serialNumber: 'serial', type: 'type' },
          { id: 'type', name: null, assetCode: null, serialNumber: null, type: 'type' },
        ],
        totalItems: 82,
      }),
    );
    const request = directory.list('org', { resourceType: 'equipment', page: 3, search: 'work' });
    if (!request) throw new Error('Expected an authorized equipment request');
    expect(await firstValueFrom(request)).toEqual({
      member: [
        { id: 'named', label: 'Extinguisher' },
        { id: 'empty', label: '' },
        { id: 'asset', label: 'asset' },
        { id: 'serial', label: 'serial' },
        { id: 'type', label: 'type' },
      ],
      totalItems: 82,
    });
    expect(equipments.list).toHaveBeenCalledWith('org', {
      page: 3,
      itemsPerPage: 30,
      search: 'work',
    });
  });

  it('propagates the owner transport failure to the store', async () => {
    grants.set([ORGANIZATION_PERMISSION.CUSTOMERS_READ]);
    const failure = new Error('Directory unavailable');
    customers.list.mockReturnValue(throwError(() => failure));
    const request = directory.list('org', { resourceType: 'customer', page: 1 });
    if (!request) throw new Error('Expected an authorized customer request');
    await expect(firstValueFrom(request)).rejects.toBe(failure);
  });
});
