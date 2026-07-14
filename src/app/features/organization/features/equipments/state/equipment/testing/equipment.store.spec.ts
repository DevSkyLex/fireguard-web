import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentMaintenanceLogOutput,
  EquipmentOutput,
} from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '../../active-equipment/active-equipment.store';
import { EquipmentStore } from '../equipment.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('EquipmentStore', () => {
  let store: EquipmentStore;
  let mockEquipmentService: {
    list: ReturnType<typeof vi.fn>;
    listMaintenanceLogs: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  const equipment = { id: 'equipment-1', name: 'Generator' } as unknown as EquipmentOutput;
  const collection: HydraCollection<EquipmentOutput> = {
    '@id': '/api/organizations/org-1/equipment',
    '@type': 'Collection',
    totalItems: 1,
    member: [equipment],
  };

  beforeEach(() => {
    mockEquipmentService = {
      list: vi.fn().mockReturnValue(of(collection)),
      listMaintenanceLogs: vi.fn().mockReturnValue(
        of({
          '@id': '/api/organizations/org-1/equipment/equipment-1/maintenance-logs',
          '@type': 'Collection',
          totalItems: 1,
          member: [
            { id: 'log-1', equipmentId: 'equipment-1' } as unknown as EquipmentMaintenanceLogOutput,
          ],
        }),
      ),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };
    mockDispatcher = { dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        EquipmentStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: EquipmentService, useValue: mockEquipmentService },
        {
          provide: ActiveEquipmentStore,
          useValue: {
            selectedEquipment: signal<EquipmentOutput | null>(null),
            isLoadingEquipment: signal(false),
          },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(EquipmentStore);
  });

  it('should load equipment', async () => {
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockEquipmentService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.equipmentList()).toEqual([equipment]);
    expect(store.totalEquipment()).toBe(1);
  });

  it('should preload inspection-create options in the browser', async () => {
    store.ensureInspectionCreateOptionsLoaded('org-1');
    await flushEffects();

    expect(mockEquipmentService.list).toHaveBeenCalledWith('org-1', { itemsPerPage: 200 });
  });

  it('should load maintenance logs through the store', async () => {
    store.loadMaintenanceLogs({ organizationId: 'org-1', equipmentId: 'equipment-1' });
    await flushEffects();

    expect(mockEquipmentService.listMaintenanceLogs).toHaveBeenCalledWith(
      'org-1',
      'equipment-1',
      undefined,
    );
    expect(store.maintenanceLogs()).toHaveLength(1);
    expect(store.totalMaintenanceLogs()).toBe(1);
  });

  describe('remove', () => {
    it('should delete the equipment, drop it from the collection and dispatch a success toast', async () => {
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.equipmentList()).toEqual([equipment]);

      store.remove({ organizationId: 'org-1', equipmentId: 'equipment-1' });
      await flushEffects();

      expect(mockEquipmentService.remove).toHaveBeenCalledWith('equipment-1');
      expect(store.deleteCallState().status).toBe('success');
      expect(store.equipmentList()).toEqual([]);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Equipment Store] deleteSucceeded' }),
      );
    });
  });
});
