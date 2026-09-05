import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { ApiError, HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
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

  beforeEach(() => {
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
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: InspectionService, useValue: mockInspectionService },
      ],
    });

    store = TestBed.inject(OrganizationAssetsPaneStore);
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

  it('surfaces an equipment load failure through the error computed', async () => {
    mockEquipmentService.list.mockReturnValue(throwError(() => apiError(500, 'boom')));

    store.loadEquipment({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.hasEquipmentError()).toBe(true);
  });
});
