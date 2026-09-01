import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '../active-equipment.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveEquipmentStore', () => {
  let store: ActiveEquipmentStore;
  let dispatch: ReturnType<typeof vi.fn>;
  let mockEquipmentService: {
    get: ReturnType<typeof vi.fn>;
  };

  const equipment = { id: 'equipment-1', name: 'Generator' } as unknown as EquipmentOutput;

  beforeEach(() => {
    dispatch = vi.fn();
    mockEquipmentService = {
      get: vi.fn().mockReturnValue(of(equipment)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: EquipmentService, useValue: mockEquipmentService },
      ],
    });

    store = TestBed.inject(ActiveEquipmentStore);
  });

  it('should resolve and expose the active equipment', async () => {
    store.resolveEquipment({ organizationId: 'org-1', equipmentId: 'equipment-1' });
    await flushEffects();

    expect(mockEquipmentService.get).toHaveBeenCalledWith('org-1', 'equipment-1');
    expect(store.selectedEquipment()).toEqual(equipment);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the previous record while resolving a different id', () => {
    store.setEquipment(equipment);
    mockEquipmentService.get.mockReturnValue(NEVER);

    store.resolveEquipment({ organizationId: 'org-1', equipmentId: 'equipment-2' });

    expect(store.selectedEquipment()).toBeNull();
    expect(store.getCallState().status).toBe('pending');
  });

  it('should keep the current record on screen while re-resolving the same id', () => {
    store.setEquipment(equipment);
    mockEquipmentService.get.mockReturnValue(NEVER);

    store.resolveEquipment({ organizationId: 'org-1', equipmentId: 'equipment-1' });

    expect(store.selectedEquipment()).toEqual(equipment);
    expect(store.getCallState().status).toBe('pending');
  });

  it('should record the failure and dispatch getFailed when the fetch errors', async () => {
    mockEquipmentService.get.mockReturnValue(throwError(() => new Error('down')));

    store.resolveEquipment({ organizationId: 'org-1', equipmentId: 'equipment-1' });
    await flushEffects();

    expect(store.selectedEquipment()).toBeNull();
    expect(store.getCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalled();
  });

  it('should merge a write payload into the selected record instead of replacing it', () => {
    const known = {
      id: 'equipment-1',
      facilityId: 'facility-1',
      facilityName: 'Main building',
      status: 'in_stock',
    } as unknown as EquipmentOutput;
    store.setEquipment(known);

    store.setEquipment({ id: 'equipment-1', status: 'operational' } as unknown as EquipmentOutput);

    expect(store.selectedEquipment()).toEqual(
      expect.objectContaining({
        id: 'equipment-1',
        status: 'operational',
        facilityId: 'facility-1',
        facilityName: 'Main building',
      }),
    );
    expect(store.getCallState().status).toBe('success');
  });

  it('should replace the selected record when the payload is a different equipment', () => {
    store.setEquipment(equipment);

    const other = { id: 'equipment-2', status: 'in_stock' } as unknown as EquipmentOutput;
    store.setEquipment(other);

    expect(store.selectedEquipment()).toEqual(other);
  });

  it('should clear the selected equipment', () => {
    store.setEquipment(equipment);
    store.clear();

    expect(store.selectedEquipment()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
