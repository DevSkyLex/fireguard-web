import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InterventionLinkedResourcesStore } from '../intervention-linked-resources.store';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const facility = { id: 'f1' } as unknown as FacilityOutput;
const equipment = { id: 'e1' } as unknown as EquipmentOutput;
const inspection = { id: 'i1' } as unknown as InspectionOutput;

describe('InterventionLinkedResourcesStore', () => {
  let store: InstanceType<typeof InterventionLinkedResourcesStore>;
  let facilityService: { listByIntervention: ReturnType<typeof vi.fn> };
  let equipmentService: { listByIntervention: ReturnType<typeof vi.fn> };
  let inspectionService: { listByIntervention: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    facilityService = {
      listByIntervention: vi.fn().mockReturnValue(of({ member: [facility] })),
    };
    equipmentService = {
      listByIntervention: vi.fn().mockReturnValue(of({ member: [equipment] })),
    };
    inspectionService = {
      listByIntervention: vi.fn().mockReturnValue(of({ member: [inspection] })),
    };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        InterventionLinkedResourcesStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: facilityService },
        { provide: EquipmentService, useValue: equipmentService },
        { provide: InspectionService, useValue: inspectionService },
      ],
    });

    store = TestBed.inject(InterventionLinkedResourcesStore);
  });

  describe('ensureFacilitiesLoaded', () => {
    it('should fetch and land in success with the members on first activation', async () => {
      store.ensureFacilitiesLoaded('int-1');
      await flush();

      expect(facilityService.listByIntervention).toHaveBeenCalledWith('int-1');
      expect(store.facilities()).toEqual([facility]);
      expect(store.facilitiesLoading()).toBe(false);
      expect(store.facilitiesError()).toBeNull();
    });

    it('should be a no-op for a second call with the same intervention id', async () => {
      store.ensureFacilitiesLoaded('int-1');
      await flush();
      store.ensureFacilitiesLoaded('int-1');
      await flush();

      expect(facilityService.listByIntervention).toHaveBeenCalledTimes(1);
    });

    it('should reset and refetch when the intervention id changes', async () => {
      store.ensureFacilitiesLoaded('int-1');
      await flush();

      facilityService.listByIntervention.mockReturnValueOnce(
        of({ member: [{ id: 'f2' } as unknown as FacilityOutput] }),
      );
      store.ensureFacilitiesLoaded('int-2');
      await flush();

      expect(facilityService.listByIntervention).toHaveBeenCalledTimes(2);
      expect(facilityService.listByIntervention).toHaveBeenLastCalledWith('int-2');
      expect(store.facilities()).toEqual([{ id: 'f2' }]);
    });

    it('should also reset the equipment and inspections call states when the intervention changes', async () => {
      store.ensureFacilitiesLoaded('int-1');
      store.ensureEquipmentLoaded('int-1');
      await flush();

      store.ensureFacilitiesLoaded('int-2');

      expect(store.equipmentLoading()).toBe(false);
      expect(store.equipment()).toEqual([]);
    });

    it('should normalize the error and dispatch a failure event', async () => {
      facilityService.listByIntervention.mockReturnValueOnce(throwError(() => new Error('boom')));

      store.ensureFacilitiesLoaded('int-1');
      await flush();

      expect(store.facilities()).toEqual([]);
      expect(store.facilitiesLoading()).toBe(false);
      expect(store.facilitiesError()).not.toBeNull();
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureEquipmentLoaded', () => {
    it('should fetch and land in success with the members on first activation', async () => {
      store.ensureEquipmentLoaded('int-1');
      await flush();

      expect(equipmentService.listByIntervention).toHaveBeenCalledWith('int-1');
      expect(store.equipment()).toEqual([equipment]);
      expect(store.equipmentLoading()).toBe(false);
    });

    it('should be a no-op for a second call with the same intervention id', async () => {
      store.ensureEquipmentLoaded('int-1');
      await flush();
      store.ensureEquipmentLoaded('int-1');
      await flush();

      expect(equipmentService.listByIntervention).toHaveBeenCalledTimes(1);
    });

    it('should normalize the error and dispatch a failure event', async () => {
      equipmentService.listByIntervention.mockReturnValueOnce(throwError(() => new Error('boom')));

      store.ensureEquipmentLoaded('int-1');
      await flush();

      expect(store.equipment()).toEqual([]);
      expect(store.equipmentError()).not.toBeNull();
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureInspectionsLoaded', () => {
    it('should fetch and land in success with the members on first activation', async () => {
      store.ensureInspectionsLoaded('int-1');
      await flush();

      expect(inspectionService.listByIntervention).toHaveBeenCalledWith('int-1');
      expect(store.inspections()).toEqual([inspection]);
      expect(store.inspectionsLoading()).toBe(false);
    });

    it('should be a no-op for a second call with the same intervention id', async () => {
      store.ensureInspectionsLoaded('int-1');
      await flush();
      store.ensureInspectionsLoaded('int-1');
      await flush();

      expect(inspectionService.listByIntervention).toHaveBeenCalledTimes(1);
    });

    it('should normalize the error and dispatch a failure event', async () => {
      inspectionService.listByIntervention.mockReturnValueOnce(throwError(() => new Error('boom')));

      store.ensureInspectionsLoaded('int-1');
      await flush();

      expect(store.inspections()).toEqual([]);
      expect(store.inspectionsError()).not.toBeNull();
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });
});
