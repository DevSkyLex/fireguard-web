import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { OrganizationPermissionService } from '@features/organization/access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
import { FacilityInspectionTab } from '../facility-inspection-tab.component';

const MOCK_ORG: OrganizationOutput = {
  id: 'org-1',
  name: 'Acme Corp',
} as OrganizationOutput;

const MOCK_INSPECTION: InspectionOutput = {
  '@id': '/api/inspections/insp-1',
  '@type': 'Inspection',
  id: 'insp-1',
  organizationId: 'org-1',
  equipmentId: 'eq-1',
  facilityId: 'fac-1',
  inspector: {
    type: 'user',
    id: null,
    firstName: 'Jean',
    lastName: 'Dupont',
    displayName: 'Jean Dupont',
    avatarUrl: null,
    organizationName: null,
  },
  status: 'submitted',
  result: 'pass',
  nonConformitiesCount: 0,
  checklistId: null,
  notes: null,
  signature: null,
  performedAt: '2025-03-01',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as unknown as InspectionOutput;

describe('FacilityInspectionTab', () => {
  const mockInspectionStore = {
    isLoadingInspections: signal<boolean>(false),
    isEmpty: signal<boolean>(true),
    inspections: signal<ReadonlyArray<InspectionOutput>>([]),
    totalInspections: signal<number>(0),
    load: vi.fn(),
    cancel: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };
  const mockConfirmationService = {
    confirm: vi.fn(),
  };

  beforeEach(() => {
    installMatchMediaMock();
    mockInspectionStore.isLoadingInspections.set(false);
    mockInspectionStore.isEmpty.set(true);
    mockInspectionStore.inspections.set([]);
    mockInspectionStore.totalInspections.set(0);
    mockInspectionStore.load.mockReset();
    mockInspectionStore.cancel.mockReset();
    mockConfirmationService.confirm.mockReset();

    TestBed.configureTestingModule({
      imports: [FacilityInspectionTab],
      providers: [
        provideRouter([]),
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: vi.fn(() => true) },
        },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
      ],
    }).overrideComponent(FacilityInspectionTab, {
      set: { providers: [{ provide: InspectionStore, useValue: mockInspectionStore }] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load inspections on the browser when facility id is available', () => {
    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();

    expect(mockInspectionStore.load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      options: { page: 1, itemsPerPage: 12, facilityId: 'fac-1', params: {} },
    });
  });

  it('should show skeletons while loading', () => {
    mockInspectionStore.isLoadingInspections.set(true);
    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show empty state when no inspections', () => {
    mockInspectionStore.isEmpty.set(true);
    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No inspections');
  });

  it('should render inspection rows when list is populated', () => {
    mockInspectionStore.isEmpty.set(false);
    mockInspectionStore.inspections.set([MOCK_INSPECTION]);
    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Jean Dupont');
  });

  it('should not show empty state when inspections are populated', () => {
    mockInspectionStore.isEmpty.set(false);
    mockInspectionStore.inspections.set([MOCK_INSPECTION]);
    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('No inspections');
  });

  it('should not load inspections during SSR', () => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [FacilityInspectionTab],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: vi.fn(() => true) },
        },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
      ],
    }).overrideComponent(FacilityInspectionTab, {
      set: { providers: [{ provide: InspectionStore, useValue: mockInspectionStore }] },
    });

    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();

    expect(mockInspectionStore.load).not.toHaveBeenCalled();
  });

  it('should confirm before cancelling a draft inspection', () => {
    const fixture = TestBed.createComponent(FacilityInspectionTab);
    fixture.componentRef.setInput('facilityId', 'fac-1');
    fixture.detectChanges();
    const draft = { ...MOCK_INSPECTION, status: 'draft' as const };

    (
      fixture.componentInstance as unknown as {
        onCancel(inspection: InspectionOutput): void;
      }
    ).onCancel(draft);

    expect(mockConfirmationService.confirm).toHaveBeenCalled();
    const options = mockConfirmationService.confirm.mock.calls[0]?.[0] as {
      accept?: () => void;
    };
    options.accept?.();
    expect(mockInspectionStore.cancel).toHaveBeenCalledWith({
      organizationId: 'org-1',
      inspectionId: draft.id,
    });
  });
});
