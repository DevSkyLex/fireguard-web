import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import {
  InterventionLinkedResourcesStore,
  LINKED_RESOURCES_PAGE_SIZE,
} from '../intervention-linked-resources.store';

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
      listByIntervention: vi.fn().mockReturnValue(of({ member: [facility], totalItems: 1 })),
    };
    equipmentService = {
      listByIntervention: vi.fn().mockReturnValue(of({ member: [equipment], totalItems: 1 })),
    };
    inspectionService = {
      listByIntervention: vi.fn().mockReturnValue(of({ member: [inspection], totalItems: 1 })),
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

      expect(facilityService.listByIntervention).toHaveBeenCalledWith('int-1', {
        page: 1,
        itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
      });
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
        of({ member: [{ id: 'f2' } as unknown as FacilityOutput], totalItems: 1 }),
      );
      store.ensureFacilitiesLoaded('int-2');
      await flush();

      expect(facilityService.listByIntervention).toHaveBeenCalledTimes(2);
      expect(facilityService.listByIntervention).toHaveBeenLastCalledWith('int-2', {
        page: 1,
        itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
      });
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

  describe('loadMoreFacilities', () => {
    it('should append the next page onto the already-loaded rows', async () => {
      facilityService.listByIntervention.mockReturnValueOnce(
        of({ member: [facility], totalItems: 45 }),
      );
      store.ensureFacilitiesLoaded('int-1');
      await flush();

      const secondPageItem = { id: 'f2' } as unknown as FacilityOutput;
      facilityService.listByIntervention.mockReturnValueOnce(
        of({ member: [secondPageItem], totalItems: 45 }),
      );
      store.loadMoreFacilities('int-1');
      await flush();

      expect(facilityService.listByIntervention).toHaveBeenLastCalledWith('int-1', {
        page: 2,
        itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
      });
      expect(store.facilities()).toEqual([facility, secondPageItem]);
      expect(store.facilitiesHasMore()).toBe(true);
    });

    it('should be a no-op while a page is already in flight', async () => {
      facilityService.listByIntervention.mockReturnValueOnce(
        of({ member: [facility], totalItems: 45 }),
      );
      store.ensureFacilitiesLoaded('int-1');
      await flush();

      const pending = new Subject<{ member: FacilityOutput[]; totalItems: number }>();
      facilityService.listByIntervention.mockReturnValueOnce(pending);

      store.loadMoreFacilities('int-1');
      store.loadMoreFacilities('int-1');
      pending.next({ member: [{ id: 'f2' } as unknown as FacilityOutput], totalItems: 45 });
      pending.complete();
      await flush();

      expect(facilityService.listByIntervention).toHaveBeenCalledTimes(2);
    });

    it('should keep the existing rows when the next page fails', async () => {
      facilityService.listByIntervention.mockReturnValueOnce(
        of({ member: [facility], totalItems: 45 }),
      );
      store.ensureFacilitiesLoaded('int-1');
      await flush();

      facilityService.listByIntervention.mockReturnValueOnce(throwError(() => new Error('boom')));
      store.loadMoreFacilities('int-1');
      await flush();

      expect(store.facilities()).toEqual([facility]);
      expect(store.facilitiesError()).not.toBeNull();
    });
  });

  describe('ensureEquipmentLoaded', () => {
    it('should fetch and land in success with the members on first activation', async () => {
      store.ensureEquipmentLoaded('int-1');
      await flush();

      expect(equipmentService.listByIntervention).toHaveBeenCalledWith('int-1', {
        page: 1,
        itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
      });
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

  describe('loadMoreEquipment', () => {
    it('should append the next page onto the already-loaded rows', async () => {
      equipmentService.listByIntervention.mockReturnValueOnce(
        of({ member: [equipment], totalItems: 45 }),
      );
      store.ensureEquipmentLoaded('int-1');
      await flush();

      const secondPageItem = { id: 'e2' } as unknown as EquipmentOutput;
      equipmentService.listByIntervention.mockReturnValueOnce(
        of({ member: [secondPageItem], totalItems: 45 }),
      );
      store.loadMoreEquipment('int-1');
      await flush();

      expect(equipmentService.listByIntervention).toHaveBeenLastCalledWith('int-1', {
        page: 2,
        itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
      });
      expect(store.equipment()).toEqual([equipment, secondPageItem]);
      expect(store.equipmentHasMore()).toBe(true);
    });

    it('should be a no-op while a page is already in flight', async () => {
      equipmentService.listByIntervention.mockReturnValueOnce(
        of({ member: [equipment], totalItems: 45 }),
      );
      store.ensureEquipmentLoaded('int-1');
      await flush();

      const pending = new Subject<{ member: EquipmentOutput[]; totalItems: number }>();
      equipmentService.listByIntervention.mockReturnValueOnce(pending);

      store.loadMoreEquipment('int-1');
      store.loadMoreEquipment('int-1');
      pending.next({ member: [{ id: 'e2' } as unknown as EquipmentOutput], totalItems: 45 });
      pending.complete();
      await flush();

      expect(equipmentService.listByIntervention).toHaveBeenCalledTimes(2);
    });

    it('should keep the existing rows when the next page fails', async () => {
      equipmentService.listByIntervention.mockReturnValueOnce(
        of({ member: [equipment], totalItems: 45 }),
      );
      store.ensureEquipmentLoaded('int-1');
      await flush();

      equipmentService.listByIntervention.mockReturnValueOnce(throwError(() => new Error('boom')));
      store.loadMoreEquipment('int-1');
      await flush();

      expect(store.equipment()).toEqual([equipment]);
      expect(store.equipmentError()).not.toBeNull();
    });
  });

  describe('ensureInspectionsLoaded', () => {
    it('should fetch and land in success with the members on first activation', async () => {
      store.ensureInspectionsLoaded('int-1');
      await flush();

      expect(inspectionService.listByIntervention).toHaveBeenCalledWith('int-1', {
        page: 1,
        itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
      });
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

  describe('loadMoreInspections', () => {
    it('should append the next page onto the already-loaded rows', async () => {
      inspectionService.listByIntervention.mockReturnValueOnce(
        of({ member: [inspection], totalItems: 45 }),
      );
      store.ensureInspectionsLoaded('int-1');
      await flush();

      const secondPageItem = { id: 'i2' } as unknown as InspectionOutput;
      inspectionService.listByIntervention.mockReturnValueOnce(
        of({ member: [secondPageItem], totalItems: 45 }),
      );
      store.loadMoreInspections('int-1');
      await flush();

      expect(inspectionService.listByIntervention).toHaveBeenLastCalledWith('int-1', {
        page: 2,
        itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
      });
      expect(store.inspections()).toEqual([inspection, secondPageItem]);
      expect(store.inspectionsHasMore()).toBe(true);
    });

    it('should be a no-op while a page is already in flight', async () => {
      inspectionService.listByIntervention.mockReturnValueOnce(
        of({ member: [inspection], totalItems: 45 }),
      );
      store.ensureInspectionsLoaded('int-1');
      await flush();

      const pending = new Subject<{ member: InspectionOutput[]; totalItems: number }>();
      inspectionService.listByIntervention.mockReturnValueOnce(pending);

      store.loadMoreInspections('int-1');
      store.loadMoreInspections('int-1');
      pending.next({ member: [{ id: 'i2' } as unknown as InspectionOutput], totalItems: 45 });
      pending.complete();
      await flush();

      expect(inspectionService.listByIntervention).toHaveBeenCalledTimes(2);
    });

    it('should keep the existing rows when the next page fails', async () => {
      inspectionService.listByIntervention.mockReturnValueOnce(
        of({ member: [inspection], totalItems: 45 }),
      );
      store.ensureInspectionsLoaded('int-1');
      await flush();

      inspectionService.listByIntervention.mockReturnValueOnce(throwError(() => new Error('boom')));
      store.loadMoreInspections('int-1');
      await flush();

      expect(store.inspections()).toEqual([inspection]);
      expect(store.inspectionsError()).not.toBeNull();
    });
  });
});
