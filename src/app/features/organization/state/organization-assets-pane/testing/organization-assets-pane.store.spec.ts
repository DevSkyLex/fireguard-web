import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError, HydraCollection } from '@core/api/models';
import { ParkService } from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import type { NonConformityOutput } from '@features/organization/features/inspections/models';
import {
  OrganizationAssetsPaneStore,
  type OrganizationAssetsPaneStoreType,
} from '../organization-assets-pane.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

const apiError = (status: number, detail: string): ApiError => ({
  '@id': '',
  '@type': 'Error',
  status,
  type: 'about:blank',
  title: 'Error',
  detail,
});

describe('OrganizationAssetsPaneStore', () => {
  let store: OrganizationAssetsPaneStoreType;
  let mockParkService: { anomalies: ReturnType<typeof vi.fn> };
  let mockEquipmentService: {
    list: ReturnType<typeof vi.fn>;
    listByFacility: ReturnType<typeof vi.fn>;
  };
  let mockInspectionService: {
    list: ReturnType<typeof vi.fn>;
    listByFacility: ReturnType<typeof vi.fn>;
  };

  const equipment = { id: 'equipment-1' } as unknown as EquipmentOutput;
  const equipmentCollection: HydraCollection<EquipmentOutput> = {
    '@id': '/api/organizations/org-1/equipment',
    '@type': 'Collection',
    totalItems: 1,
    member: [equipment],
  };

  const inspection = { id: 'inspection-1' } as unknown as InspectionOutput;
  const inspectionCollection: HydraCollection<InspectionOutput> = {
    '@id': '/api/organizations/org-1/inspections',
    '@type': 'Collection',
    totalItems: 1,
    member: [inspection],
  };

  const anomaly = { id: 'child-anomaly' } as unknown as NonConformityOutput;
  const anomaliesCollection: HydraCollection<NonConformityOutput> = {
    '@id': '/api/organizations/org-1/park-anomalies',
    '@type': 'Collection',
    totalItems: 1,
    member: [anomaly],
  };

  beforeEach(() => {
    mockParkService = { anomalies: vi.fn().mockReturnValue(of(anomaliesCollection)) };
    mockEquipmentService = {
      list: vi.fn().mockReturnValue(of(equipmentCollection)),
      listByFacility: vi.fn().mockReturnValue(of(equipmentCollection)),
    };
    mockInspectionService = {
      list: vi.fn().mockReturnValue(of(inspectionCollection)),
      listByFacility: vi.fn().mockReturnValue(of(inspectionCollection)),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationAssetsPaneStore,
        { provide: ParkService, useValue: mockParkService },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: InspectionService, useValue: mockInspectionService },
      ],
    });

    store = TestBed.inject(OrganizationAssetsPaneStore);
  });

  it('retains direct anomaly scope, customer and family on subsequent pages', () => {
    mockParkService.anomalies.mockReturnValue(of({ ...anomaliesCollection, totalItems: 123 }));
    store.loadAnomalies({
      organizationId: 'org-1',
      facilityId: 'site',
      family: 'fire',
      customerId: 'customer',
      includeDescendants: false,
      page: 3,
    });
    expect(mockParkService.anomalies).toHaveBeenCalledExactlyOnceWith('org-1', {
      page: 3,
      itemsPerPage: 50,
      params: {
        facilityId: 'site',
        includeDescendants: false,
        family: 'fire',
        customerId: 'customer',
      },
    });
    expect(store.anomaliesTotal()).toBe(123);
    expect(store.anomaliesPage()).toBe(3);
  });

  it('clears subtree findings and totals while the direct anomaly scope loads', () => {
    const direct = new Subject<HydraCollection<NonConformityOutput>>();
    store.loadAnomalies({ organizationId: 'org-1', facilityId: 'site' });
    expect(mockParkService.anomalies).toHaveBeenLastCalledWith('org-1', {
      page: 1,
      itemsPerPage: 50,
      params: { facilityId: 'site', includeDescendants: true },
    });
    expect(store.anomalies()).toEqual([anomaly]);
    expect(store.anomaliesTotal()).toBe(1);
    mockParkService.anomalies.mockReturnValueOnce(direct);
    store.loadAnomalies({ organizationId: 'org-1', facilityId: 'site', includeDescendants: false });
    expect(store.anomaliesCallState().status).toBe('pending');
    expect(store.anomalies()).toEqual([]);
    expect(store.anomaliesTotal()).toBe(0);
    direct.next({ ...anomaliesCollection, member: [], totalItems: 0 });
    expect(store.anomaliesCallState().status).toBe('success');
    expect(store.anomalies()).toEqual([]);
    expect(store.anomaliesTotal()).toBe(0);
  });

  it('loads organization-wide equipment when no facility is given', async () => {
    store.loadEquipment({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockEquipmentService.list).toHaveBeenCalledWith('org-1', { page: 1, itemsPerPage: 50 });
    expect(mockEquipmentService.listByFacility).not.toHaveBeenCalled();
    expect(store.equipment()).toEqual([equipment]);
  });

  it('loads facility-scoped equipment when a facility is given', async () => {
    store.loadEquipment({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockEquipmentService.listByFacility).toHaveBeenCalledWith('org-1', 'facility-1', {
      page: 1,
      itemsPerPage: 50,
      params: { includeDescendants: true },
    });
  });

  it('loads facility-scoped inspections when a facility is given', async () => {
    store.loadInspections({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockInspectionService.listByFacility).toHaveBeenCalledWith('org-1', 'facility-1', {
      page: 1,
      itemsPerPage: 50,
    });
    expect(store.inspections()).toEqual([inspection]);
  });

  it('omits subtree traversal from organization-wide inspection requests even for a legacy caller', () => {
    store.loadInspections({
      organizationId: 'org-1',
      family: 'fire',
      customerId: 'customer',
      includeDescendants: true,
      page: 2,
    });
    expect(mockInspectionService.list).toHaveBeenCalledExactlyOnceWith('org-1', {
      page: 2,
      itemsPerPage: 50,
      params: { family: 'fire', customerId: 'customer' },
    });
    expect(mockInspectionService.listByFacility).not.toHaveBeenCalled();
  });

  it('keeps the direct equipment scope across pages and reports its full total', async () => {
    mockEquipmentService.listByFacility.mockReturnValue(
      of({ ...equipmentCollection, totalItems: 251 }),
    );
    store.loadEquipment({
      organizationId: 'org-1',
      facilityId: 'facility-1',
      includeDescendants: false,
      page: 3,
    });
    await flushEffects();
    expect(mockEquipmentService.listByFacility).toHaveBeenLastCalledWith('org-1', 'facility-1', {
      page: 3,
      itemsPerPage: 50,
      params: { includeDescendants: false },
    });
    expect(store.equipmentTotal()).toBe(251);
    expect(store.equipmentPage()).toBe(3);
  });

  it('surfaces an equipment load failure through the error computed', async () => {
    mockEquipmentService.list.mockReturnValue(throwError(() => apiError(500, 'boom')));

    store.loadEquipment({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.hasEquipmentError()).toBe(true);
  });

  it('uses the same family and customer filters on every equipment page and the due queue', () => {
    store.loadEquipment({
      organizationId: 'org-1',
      facilityId: 'site',
      family: 'fire',
      customerId: 'customer',
      maintenanceDueStatus: 'due',
      page: 2,
    });
    expect(mockEquipmentService.listByFacility).toHaveBeenLastCalledWith('org-1', 'site', {
      page: 2,
      itemsPerPage: 50,
      params: {
        includeDescendants: true,
        family: 'fire',
        customerId: 'customer',
        maintenanceDueStatus: 'due',
      },
    });
    store.loadInspections({
      organizationId: 'org-1',
      facilityId: 'site',
      family: 'fire',
      customerId: 'customer',
      includeDescendants: true,
    });
    expect(mockInspectionService.listByFacility).toHaveBeenLastCalledWith('org-1', 'site', {
      page: 1,
      itemsPerPage: 50,
      params: { family: 'fire', customerId: 'customer', includeDescendants: true },
    });
  });
  it('cancels obsolete customer reads and clears previous totals while the new scope loads', () => {
    const old = new Subject<HydraCollection<EquipmentOutput>>();
    const next = new Subject<HydraCollection<EquipmentOutput>>();
    store.loadEquipment({ organizationId: 'org-1', family: 'fire', customerId: 'first' });
    mockEquipmentService.list.mockReturnValueOnce(old).mockReturnValueOnce(next);
    store.loadEquipment({ organizationId: 'org-1', family: 'fire', customerId: 'first', page: 2 });
    store.loadEquipment({ organizationId: 'org-1', family: 'fire', customerId: 'second' });
    expect(old.observed).toBe(false);
    expect(store.equipment()).toEqual([]);
    expect(store.equipmentTotal()).toBe(0);
    next.next({ ...equipmentCollection, totalItems: 200 });
    expect(store.equipmentTotal()).toBe(200);
  });
});
