import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { ApiError, HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InterventionService } from '@features/organization/features/interventions';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { FacilityOverviewStore } from '../facility-overview.store';

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

describe('FacilityOverviewStore', () => {
  let store: FacilityOverviewStore;
  let mockInspectionService: { list: ReturnType<typeof vi.fn> };
  let mockEquipmentService: { list: ReturnType<typeof vi.fn> };
  let mockInterventionService: { list: ReturnType<typeof vi.fn> };

  const passedInspection = {
    id: 'inspection-1',
    result: 'pass',
    status: 'closed',
    performedAt: new Date(Date.now() - 86_400_000).toISOString(),
  } as unknown as InspectionOutput;

  const overdueInspection = {
    id: 'inspection-2',
    result: 'fail',
    status: 'open',
    performedAt: new Date(Date.now() - 172_800_000).toISOString(),
  } as unknown as InspectionOutput;

  const upcomingInspection = {
    id: 'inspection-3',
    result: 'pass',
    status: 'scheduled',
    performedAt: new Date(Date.now() + 86_400_000).toISOString(),
  } as unknown as InspectionOutput;

  const inspectionsCollection: HydraCollection<InspectionOutput> = {
    '@id': '/api/organizations/org-1/inspections',
    '@type': 'Collection',
    totalItems: 3,
    member: [passedInspection, overdueInspection, upcomingInspection],
  };

  const operationalEquipment = {
    id: 'equipment-1',
    status: 'operational',
  } as unknown as EquipmentOutput;

  const maintenanceEquipment = {
    id: 'equipment-2',
    status: 'under_maintenance',
  } as unknown as EquipmentOutput;

  const equipmentCollection: HydraCollection<EquipmentOutput> = {
    '@id': '/api/organizations/org-1/equipment',
    '@type': 'Collection',
    totalItems: 2,
    member: [operationalEquipment, maintenanceEquipment],
  };

  const siteIntervention = {
    id: 'intervention-1',
    name: 'Annual fire check',
    status: 'planned',
    updatedAt: new Date().toISOString(),
  } as unknown as InterventionOutput;

  const interventionsCollection: HydraCollection<InterventionOutput> = {
    '@id': '/api/interventions',
    '@type': 'Collection',
    totalItems: 1,
    member: [siteIntervention],
  };

  beforeEach(() => {
    mockInspectionService = { list: vi.fn().mockReturnValue(of(inspectionsCollection)) };
    mockEquipmentService = { list: vi.fn().mockReturnValue(of(equipmentCollection)) };
    mockInterventionService = { list: vi.fn().mockReturnValue(of(interventionsCollection)) };

    TestBed.configureTestingModule({
      providers: [
        FacilityOverviewStore,
        { provide: InspectionService, useValue: mockInspectionService },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: InterventionService, useValue: mockInterventionService },
      ],
    });

    store = TestBed.inject(FacilityOverviewStore);
  });

  it('starts idle with empty previews', () => {
    expect(store.inspections()).toEqual([]);
    expect(store.equipment()).toEqual([]);
    expect(store.interventions()).toEqual([]);
    expect(store.isLoadingInspections()).toBe(false);
    expect(store.isLoadingEquipment()).toBe(false);
    expect(store.isLoadingInterventions()).toBe(false);
    expect(store.complianceRate()).toBeNull();
    expect(store.complianceDisplay()).toBe('—');
    expect(store.equipmentCount()).toBe(0);
  });

  describe('loadInspections', () => {
    it('populates inspections and derived metrics on success', async () => {
      store.loadInspections({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockInspectionService.list).toHaveBeenCalledWith('org-1', {
        itemsPerPage: 200,
        facilityId: 'facility-1',
      });
      expect(store.inspections()).toHaveLength(3);
      expect(store.isLoadingInspections()).toBe(false);
      expect(store.complianceRate()).toBe(67);
      expect(store.complianceDisplay()).toBe('67%');
      expect(store.overdueInspectionsCount()).toBe(1);
      expect(store.nextInspectionAt()).not.toBeNull();
      expect(store.nextInspectionInDays()).toBeGreaterThanOrEqual(0);
      expect(store.recentInspections()).toHaveLength(3);
    });

    it('clears inspections and reports a normalized error on failure', async () => {
      mockInspectionService.list.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadInspections({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(store.inspections()).toEqual([]);
      expect(store.isLoadingInspections()).toBe(false);
      expect(store.complianceRate()).toBeNull();
    });
  });

  describe('loadEquipment', () => {
    it('populates equipment and derived metrics on success', async () => {
      store.loadEquipment({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockEquipmentService.list).toHaveBeenCalledWith('org-1', {
        itemsPerPage: 200,
        params: { facilityId: 'facility-1' },
      });
      expect(store.equipment()).toHaveLength(2);
      expect(store.isLoadingEquipment()).toBe(false);
      expect(store.equipmentCount()).toBe(2);
      expect(store.equipmentNeedingAttentionCount()).toBe(1);
      expect(store.equipmentDescription()).toContain('1');

      const rows = store.equipmentStatusRows();
      expect(rows).toHaveLength(4);
      const commissionedRow = rows.find((row) => row.label.includes('Commissioned'));
      expect(commissionedRow?.count).toBe(1);
      expect(commissionedRow?.ratio).toBe(0.5);
    });

    it('clears equipment and resets counts on failure', async () => {
      mockEquipmentService.list.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadEquipment({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(store.equipment()).toEqual([]);
      expect(store.isLoadingEquipment()).toBe(false);
      expect(store.equipmentCount()).toBe(0);
      expect(store.equipmentStatusRows().every((row) => row.total === 0)).toBe(true);
    });
  });

  describe('loadInterventions', () => {
    it('populates interventions on this site on success', async () => {
      store.loadInterventions({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockInterventionService.list).toHaveBeenCalledWith('org-1', {
        site: '/api/facilities/facility-1',
        itemsPerPage: 5,
        order: { updatedAt: 'desc' },
      });
      expect(store.interventions()).toHaveLength(1);
      expect(store.isLoadingInterventions()).toBe(false);
    });

    it('clears interventions and reports a normalized error on failure', async () => {
      mockInterventionService.list.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadInterventions({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(store.interventions()).toEqual([]);
      expect(store.isLoadingInterventions()).toBe(false);
    });
  });

  describe('load', () => {
    it('triggers the inspection, equipment and intervention loads', async () => {
      store.load({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockInspectionService.list).toHaveBeenCalledTimes(1);
      expect(mockEquipmentService.list).toHaveBeenCalledTimes(1);
      expect(mockInterventionService.list).toHaveBeenCalledTimes(1);
      expect(store.inspections()).toHaveLength(3);
      expect(store.equipment()).toHaveLength(2);
      expect(store.interventions()).toHaveLength(1);
    });
  });
});
