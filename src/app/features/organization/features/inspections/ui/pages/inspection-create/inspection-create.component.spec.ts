import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityStore } from '@features/organization/features/facilities/state';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import type { InspectionFormValues } from '@features/organization/features/inspections/ui/forms';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { InspectionCreatePage } from './inspection-create.component';

const MOCK_ORG: OrganizationOutput = {
  id: 'org-1',
  name: 'Acme Corp',
} as OrganizationOutput;

describe('InspectionCreatePage', () => {
  const mockEquipmentStore = {
    equipmentList: signal<readonly unknown[]>([]),
    ensureInspectionCreateOptionsLoaded: vi.fn(),
  };
  const mockFacilityStore = {
    facilities: signal<readonly unknown[]>([]),
    ensureParentOptionsLoaded: vi.fn(),
  };
  const mockChecklistStore = {
    checklists: signal<readonly unknown[]>([]),
    ensureInspectionCreateOptionsLoaded: vi.fn(),
  };
  const mockInspectionStore = {
    isCreating: signal<boolean>(false),
    createCallState: signal<{ status: string; error: unknown; data: InspectionOutput | null }>({
      status: 'idle',
      error: null,
      data: null,
    }),
    create: vi.fn(),
  };
  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
    selectedOrganizationId: signal<string | null>(MOCK_ORG.id),
  };
  const mockRouterNavigate = vi.fn().mockResolvedValue(true);
  const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
  const mockMessageService = { add: vi.fn() };
  const mockQuotaStore = { reload: vi.fn() };

  const configure = (platform: 'browser' | 'server' = 'browser'): void => {
    TestBed.configureTestingModule({
      imports: [InspectionCreatePage],
      providers: [
        { provide: Router, useValue: { navigate: mockRouterNavigate } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: OrganizationQuotaStore, useValue: mockQuotaStore },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).overrideComponent(InspectionCreatePage, {
      set: {
        providers: [
          { provide: InspectionStore, useValue: mockInspectionStore },
          { provide: EquipmentStore, useValue: mockEquipmentStore },
          { provide: FacilityStore, useValue: mockFacilityStore },
          { provide: ChecklistStore, useValue: mockChecklistStore },
        ],
      },
    });
  };

  beforeEach(() => {
    mockEquipmentStore.equipmentList.set([]);
    mockEquipmentStore.ensureInspectionCreateOptionsLoaded.mockReset();
    mockFacilityStore.facilities.set([]);
    mockFacilityStore.ensureParentOptionsLoaded.mockReset();
    mockChecklistStore.checklists.set([]);
    mockChecklistStore.ensureInspectionCreateOptionsLoaded.mockReset();
    mockInspectionStore.isCreating.set(false);
    mockInspectionStore.createCallState.set({ status: 'idle', error: null, data: null });
    mockInspectionStore.create.mockReset();
    mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);
    mockRouterNavigate.mockClear();
    mockQuotaStore.reload.mockClear();

    configure();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display page heading', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('New Inspection');
  });

  it('should render the inspection form', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-inspection-form')).not.toBeNull();
  });

  it('should load equipment, facility and checklist dropdown stores on the browser for the active organization', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).toHaveBeenCalledWith('org-1');
    expect(mockFacilityStore.ensureParentOptionsLoaded).toHaveBeenCalledWith('org-1');
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should not load dropdown stores when no active organization is available', () => {
    mockActiveOrgStore.selectedOrganization.set(null);

    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
    expect(mockFacilityStore.ensureParentOptionsLoaded).not.toHaveBeenCalled();
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
  });

  it('should not load dropdown stores during SSR', () => {
    TestBed.resetTestingModule();
    configure('server');

    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    expect(mockEquipmentStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
    expect(mockFacilityStore.ensureParentOptionsLoaded).not.toHaveBeenCalled();
    expect(mockChecklistStore.ensureInspectionCreateOptionsLoaded).not.toHaveBeenCalled();
  });

  it('should dispatch create action with the mapped payload on handleSubmit', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    const values: InspectionFormValues = {
      equipmentId: 'equip-1',
      result: 'pass',
      performedAt: new Date('2026-01-10T09:00:00.000Z'),
      inspectorType: 'user',
      inspectorName: 'John Doe',
      facilityId: 'facility-1',
      checklistId: 'checklist-1',
      notes: 'All good',
      signature: 'JD',
    };
    fixture.componentInstance['handleSubmit'](values);

    expect(mockInspectionStore.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        equipmentId: 'equip-1',
        result: 'pass',
        performedAt: '2026-01-10T09:00:00.000Z',
        inspectorType: 'user',
        inspectorName: 'John Doe',
        facilityId: 'facility-1',
        checklistId: 'checklist-1',
        notes: 'All good',
        signature: 'JD',
      },
    });
  });

  it('should omit optional fields from the create payload when left blank', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    fixture.componentInstance['handleSubmit']({
      equipmentId: 'equip-1',
      result: 'pass',
      performedAt: null,
      inspectorType: 'user',
      inspectorName: 'John Doe',
      facilityId: '',
      checklistId: '',
      notes: '',
      signature: '',
    });

    expect(mockInspectionStore.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        equipmentId: 'equip-1',
        result: 'pass',
        performedAt: expect.any(String) as string,
        inspectorType: 'user',
        inspectorName: 'John Doe',
      },
    });
  });

  it('should not dispatch create when organization is missing', () => {
    mockActiveOrgStore.selectedOrganization.set(null);
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    fixture.componentInstance['handleSubmit']({
      equipmentId: 'equip-1',
      result: 'pass',
      performedAt: new Date('2026-01-10T09:00:00.000Z'),
      inspectorType: 'user',
      inspectorName: 'John Doe',
      facilityId: '',
      checklistId: '',
      notes: '',
      signature: '',
    });

    expect(mockInspectionStore.create).not.toHaveBeenCalled();
  });

  it('should navigate back to the list on handleCancel', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    fixture.componentInstance['handleCancel']();

    expect(mockRouterNavigate).toHaveBeenCalledWith(['..'], { relativeTo: expect.anything() });
  });

  it('should navigate to the list when create succeeds', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();
    mockRouterNavigate.mockClear();

    mockInspectionStore.createCallState.set({
      status: 'success',
      error: null,
      data: { id: 'inspection-1' } as InspectionOutput,
    });
    fixture.detectChanges();

    expect(mockRouterNavigate).toHaveBeenCalledWith(['..'], { relativeTo: expect.anything() });
  });

  it('should open the quota upgrade dialog and reload quota on a quota-exceeded failure', () => {
    const fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.detectChanges();

    mockInspectionStore.createCallState.set({
      status: 'error',
      error: { code: 409 },
      data: null,
    });
    fixture.detectChanges();

    expect(mockQuotaStore.reload).toHaveBeenCalled();
    expect(fixture.componentInstance['quotaDialogVisible']()).toBe(true);
  });
});
