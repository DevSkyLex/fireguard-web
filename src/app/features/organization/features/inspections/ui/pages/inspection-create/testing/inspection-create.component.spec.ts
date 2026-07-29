import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { OrganizationQuotaStore } from '@features/organization/state';
import { InspectionCreatePage } from '../inspection-create.component';

describe('InspectionCreatePage', () => {
  /**
   * Builds the page through a fixture rather than `new`: the reference-data
   * loads run from an effect fed by the routed input, so they only happen once
   * that input is bound and change detection has run — exactly as the router
   * does it.
   */
  const setup = (platform: 'browser' | 'server' = 'browser') => {
    const mockEquipmentStore = {
      ensureInspectionCreateOptionsLoaded: vi.fn(),
      equipmentList: signal([]),
    };
    const mockFacilityStore = {
      ensureParentOptionsLoaded: vi.fn(),
      facilities: signal([]),
    };
    const mockChecklistStore = {
      ensureInspectionCreateOptionsLoaded: vi.fn(),
      checklists: signal([]),
    };
    const mockInspectionStore = {
      createCallState: signal({ status: 'idle', error: null, data: null }),
      isCreating: signal(false),
      createError: signal(null),
      create: vi.fn(),
    };
    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      routerState: { snapshot: { root: { paramMap: { get: (): null => null }, children: [] } } },
      events: EMPTY,
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        // Root organization stores reach the transport through ENV_CONFIG.
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test.com' } },
        { provide: OrganizationQuotaStore, useValue: { reload: vi.fn() } },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (): null => null } } },
        },
        { provide: Events, useValue: { on: vi.fn(() => EMPTY) } },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
      // The page provides these four itself; overriding them keeps the real
      // transport (and its ENV_CONFIG) out of the fixture.
    }).overrideComponent(InspectionCreatePage, {
      set: {
        providers: [
          { provide: EquipmentStore, useValue: mockEquipmentStore },
          { provide: FacilityStore, useValue: mockFacilityStore },
          { provide: ChecklistStore, useValue: mockChecklistStore },
          { provide: InspectionStore, useValue: mockInspectionStore },
        ],
      },
    });

    const fixture: ComponentFixture<InspectionCreatePage> =
      TestBed.createComponent(InspectionCreatePage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    return {
      component: fixture.componentInstance,
      mockEquipmentStore,
      mockFacilityStore,
      mockChecklistStore,
    };
  };

  it('should load the dropdown stores on the browser for the routed organization', () => {
    const { component, mockEquipmentStore, mockFacilityStore, mockChecklistStore } = setup();

    expect(component).toBeTruthy();
    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).toHaveBeenCalledWith('org-1');
    expect(mockFacilityStore.ensureParentOptionsLoaded).toHaveBeenCalledWith('org-1');
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should not load dropdown stores during SSR', () => {
    const { mockEquipmentStore, mockFacilityStore, mockChecklistStore } = setup('server');

    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
    expect(mockFacilityStore.ensureParentOptionsLoaded).not.toHaveBeenCalled();
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
  });
});
