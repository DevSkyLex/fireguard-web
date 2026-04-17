import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '../active-equipment.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveEquipmentStore', () => {
  let store: ActiveEquipmentStore;
  let mockEquipmentService: {
    get: ReturnType<typeof vi.fn>;
  };

  const equipment = { id: 'equipment-1', name: 'Generator' } as unknown as EquipmentOutput;

  beforeEach(() => {
    mockEquipmentService = {
      get: vi.fn().mockReturnValue(of(equipment)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: EquipmentService, useValue: mockEquipmentService },
      ],
    });

    store = TestBed.inject(ActiveEquipmentStore);
  });

  it('should resolve and expose the active equipment', async () => {
    store.resolveEquipment('org-1', 'equipment-1').subscribe();
    await flushEffects();

    expect(mockEquipmentService.get).toHaveBeenCalledWith('org-1', 'equipment-1');
    expect(store.selectedEquipment()).toEqual(equipment);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the selected equipment', () => {
    store.setEquipment(equipment);
    store.clear();

    expect(store.selectedEquipment()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
