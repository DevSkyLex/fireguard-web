import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { InspectionCreationOptionsStore } from '../inspection-creation-options.store';

describe('InspectionCreationOptionsStore', () => {
  let store: InstanceType<typeof InspectionCreationOptionsStore>;
  let equipment: { list: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;
  let checklists: { list: ReturnType<typeof vi.fn> };
  const sessionRevision = signal(0);

  beforeEach(() => {
    dispatch = vi.fn();
    sessionRevision.set(0);
    checklists = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
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
        { provide: ChecklistService, useValue: checklists },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision, isAuthenticated: signal(true) },
        },
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

  it('offers the 101st equipment through server pages', () => {
    equipment.list.mockReturnValueOnce(of({ member: [], totalItems: 101 })).mockReturnValueOnce(
      of({
        member: [{ id: 'e-101', type: 'fire_extinguisher', serialNumber: 'SN-101' }],
        totalItems: 101,
      }),
    );
    store.loadEquipmentOptions('org-1');
    expect(store.equipmentPageCount()).toBe(2);
    store.loadEquipmentOptions({ organizationId: 'org-1', page: 2 });
    expect(equipment.list).toHaveBeenLastCalledWith('org-1', { page: 2, itemsPerPage: 100 });
    expect(store.equipmentOptions()[0].value).toBe('e-101');
  });

  it.each([101, 151, 201])(
    'makes all %i active checklists accessible through API-bounded pages',
    (total) => {
      const records = Array.from({ length: total }, (_, index) => ({
        id: `c-${index + 1}`,
        name: `Checklist ${index + 1}`,
      }));
      checklists.list.mockImplementation(
        (_organizationId: string, options: { page: number; itemsPerPage: number }) => {
          const serverPageSize = Math.min(options.itemsPerPage, 100);
          return of({
            member: records.slice(
              (options.page - 1) * serverPageSize,
              options.page * serverPageSize,
            ),
            totalItems: total,
          });
        },
      );
      const allIds: string[] = [];
      const expectedPageCount = Math.ceil(total / 100);
      for (let page = 1; page <= expectedPageCount; page += 1) {
        store.loadChecklists({ organizationId: 'org-1', page });
        expect(checklists.list).toHaveBeenNthCalledWith(page, 'org-1', {
          status: 'active',
          page,
          itemsPerPage: 100,
        });
        expect(store.checklistPageCount()).toBe(expectedPageCount);
        expect(store.checklistPage()).toBe(page);
        allIds.push(...store.checklists().map((item) => item.id));
      }
      expect(allIds).toEqual(records.map((item) => item.id));
      expect(new Set(allIds).size).toBe(total);
      expect(store.checklists().at(-1)?.id).toBe(`c-${total}`);
    },
  );

  it('searches on the server, resets the page and cancels delayed queries on clear', () => {
    vi.useFakeTimers();
    store.searchEquipment({ organizationId: 'org-1', search: 'remote serial' });
    vi.advanceTimersByTime(300);
    expect(equipment.list).toHaveBeenCalledWith('org-1', {
      page: 1,
      itemsPerPage: 100,
      search: 'remote serial',
    });
    store.searchChecklists({ organizationId: 'org-1', search: 'obsolete' });
    store.clear();
    vi.advanceTimersByTime(300);
    expect(checklists.list).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('cancels both independent option reads when organization or session changes', () => {
    const equipmentResponse = new Subject<never>();
    const checklistResponse = new Subject<never>();
    equipment.list.mockReturnValueOnce(equipmentResponse);
    checklists.list.mockReturnValueOnce(checklistResponse);
    store.loadEquipmentOptions('org-1');
    store.loadChecklists({ organizationId: 'org-1' });
    store.loadEquipmentOptions('org-2');
    expect(equipmentResponse.observed).toBe(false);
    expect(checklistResponse.observed).toBe(false);
    sessionRevision.set(1);
    TestBed.tick();
    expect(store.organizationId()).toBeNull();
    expect(store.equipmentOptions()).toEqual([]);
  });

  it('does not read picker options during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        InspectionCreationOptionsStore,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision, isAuthenticated: signal(true) },
        },
        { provide: ChecklistService, useValue: checklists },
        { provide: EquipmentService, useValue: equipment },
        { provide: Dispatcher, useValue: { dispatch } },
      ],
    });
    const serverStore = TestBed.inject(InspectionCreationOptionsStore);
    serverStore.loadEquipmentOptions('org-1');
    serverStore.loadChecklists({ organizationId: 'org-1' });
    expect(equipment.list).not.toHaveBeenCalled();
    expect(checklists.list).not.toHaveBeenCalled();
  });
});
