import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InspectionCreatePage } from '../inspection-create.component';

describe('InspectionCreatePage', () => {
  const setup = (organizationId: string | null = 'org-1') => {
    const mockEquipmentStore = {
      ensureInspectionCreateOptionsLoaded: vi.fn(),
    };
    const mockFacilityStore = {
      ensureParentOptionsLoaded: vi.fn(),
    };
    const mockChecklistStore = {
      ensureInspectionCreateOptionsLoaded: vi.fn(),
    };
    const mockInspectionStore = {
      createCallState: signal({ status: 'idle', error: null, data: null }),
      create: vi.fn(),
    };
    const mockActiveOrganizationStore = {
      selectedOrganization: signal(
        organizationId ? ({ id: organizationId, name: 'Fireguard Org' } as const) : null,
      ),
    };
    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };
    const mockEvents = {
      on: vi.fn(() => EMPTY),
    };
    const mockMessageService = {
      add: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: EquipmentStore, useValue: mockEquipmentStore },
        { provide: FacilityStore, useValue: mockFacilityStore },
        { provide: ChecklistStore, useValue: mockChecklistStore },
        { provide: InspectionStore, useValue: mockInspectionStore },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new InspectionCreatePage());
    return {
      component,
      mockEquipmentStore,
      mockFacilityStore,
      mockChecklistStore,
    };
  };

  it('should load inspection-create dropdown stores on the browser for the active organization', () => {
    const { component, mockEquipmentStore, mockFacilityStore, mockChecklistStore } = setup();

    expect(component).toBeTruthy();
    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).toHaveBeenCalledWith('org-1');
    expect(mockFacilityStore.ensureParentOptionsLoaded).toHaveBeenCalledWith('org-1');
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should not load dropdown stores when no active organization is available', () => {
    const { mockEquipmentStore, mockFacilityStore, mockChecklistStore } = setup(null);

    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
    expect(mockFacilityStore.ensureParentOptionsLoaded).not.toHaveBeenCalled();
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
  });

  it('should not load dropdown stores during SSR', () => {
    const mockEquipmentStore = {
      ensureInspectionCreateOptionsLoaded: vi.fn(),
    };
    const mockFacilityStore = {
      ensureParentOptionsLoaded: vi.fn(),
    };
    const mockChecklistStore = {
      ensureInspectionCreateOptionsLoaded: vi.fn(),
    };
    const mockInspectionStore = {
      createCallState: signal({ status: 'idle', error: null, data: null }),
      create: vi.fn(),
    };
    const mockActiveOrganizationStore = {
      selectedOrganization: signal({ id: 'org-1', name: 'Fireguard Org' } as const),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: EquipmentStore, useValue: mockEquipmentStore },
        { provide: FacilityStore, useValue: mockFacilityStore },
        { provide: ChecklistStore, useValue: mockChecklistStore },
        { provide: InspectionStore, useValue: mockInspectionStore },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Events, useValue: { on: vi.fn(() => EMPTY) } },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    });

    TestBed.runInInjectionContext(() => new InspectionCreatePage());

    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
    expect(mockFacilityStore.ensureParentOptionsLoaded).not.toHaveBeenCalled();
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
  });
});
