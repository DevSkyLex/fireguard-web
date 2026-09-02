import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { InspectionCreationOptionsStore } from '../inspection-creation-options.store';

describe('InspectionCreationOptionsStore', () => {
  let store: InstanceType<typeof InspectionCreationOptionsStore>;
  let equipment: { list: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatch = vi.fn();
    equipment = {
      list: vi.fn().mockReturnValue(
        of({
          member: [
            {
              id: 'equipment-1',
              type: 'fire_extinguisher',
              serialNumber: 'SN-1',
              locationLabel: 'Hall',
              facilityName: 'Head office',
            },
            {
              id: 'equipment-2',
              type: 'smoke_detector',
              serialNumber: null,
              locationLabel: null,
              facilityName: null,
            },
          ],
          totalItems: 2,
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        InspectionCreationOptionsStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: EquipmentService, useValue: equipment },
      ],
    });
    store = TestBed.inject(InspectionCreationOptionsStore);
  });

  it('loads and maps the organization equipment into select options', async () => {
    store.loadEquipmentOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(equipment.list).toHaveBeenCalledWith('org-1', { page: 1, itemsPerPage: 100 });
    expect(store.equipmentOptions()).toEqual([
      {
        label: 'SN-1',
        value: 'equipment-1',
        typeLabel: 'Fire extinguisher',
        secondary: 'Hall · Head office',
      },
      {
        label: 'Smoke detector',
        value: 'equipment-2',
        typeLabel: 'Smoke detector',
        secondary: null,
      },
    ]);
    expect(store.loadError()).toBeNull();
  });

  it('surfaces an error and clears the options when the load fails', async () => {
    equipment.list.mockReturnValue(throwError(() => new Error('boom')));

    store.loadEquipmentOptions('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.equipmentOptions()).toEqual([]);
    expect(store.loadError()).not.toBeNull();
    expect(dispatch).toHaveBeenCalled();
  });
});
