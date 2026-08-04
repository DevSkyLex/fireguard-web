import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { OrganizationPermissionService } from '@features/organization/access';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityStore } from '@features/organization/features/facilities/state';
import type {
  InspectionOutput,
  NonConformityOutput,
} from '@features/organization/features/inspections/models';
import {
  ActiveInspectionStore,
  InspectionStore,
} from '@features/organization/features/inspections/state';
import { InspectionDetailPage } from '../inspection-detail.component';

const MOCK_INSPECTION: InspectionOutput = {
  '@id': '/api/inspections/insp-1',
  '@type': 'Inspection',
  id: 'insp-1',
  organizationId: 'org-1',
  equipmentId: 'equip-1',
  facilityId: 'fac-1',
  result: 'pass',
  status: 'draft',
  performedAt: '2025-06-01T10:00:00Z',
  inspector: {
    type: 'user',
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    avatarUrl: null,
    organizationName: null,
  },
  checklistId: null,
  notes: null,
  signature: null,
  nonConformitiesCount: 0,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
} as unknown as InspectionOutput;

const MOCK_SUBMITTED_INSPECTION: InspectionOutput = {
  ...MOCK_INSPECTION,
  status: 'submitted',
} as unknown as InspectionOutput;

describe('InspectionDetailPage', () => {
  beforeAll(() => {
    // p-tabs (p-tablist) observes its own size to decide when to show the
    // scroll arrows; jsdom carries neither ResizeObserver nor matchMedia.
    const windowWithResizeObserver = window as Window & {
      ResizeObserver?: typeof ResizeObserver;
    };

    if (typeof windowWithResizeObserver.ResizeObserver === 'undefined') {
      class ResizeObserverMock {
        public readonly observe = vi.fn();
        public readonly unobserve = vi.fn();
        public readonly disconnect = vi.fn();
      }

      windowWithResizeObserver.ResizeObserver =
        ResizeObserverMock as unknown as typeof ResizeObserver;
    }
    if (typeof window.matchMedia === 'undefined' || typeof window.matchMedia !== 'function') {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }
  });

  // The relation pickers' option sources. Their `ensure*Loaded` methods are
  // only called when a relation is opened, so the default state is empty.
  const mockEquipmentStore = {
    equipmentList: signal<readonly { id: string; serialNumber: string | null }[]>([]),
    ensureInspectionCreateOptionsLoaded: vi.fn(),
  };
  const mockFacilityStore = {
    facilities: signal<readonly { id: string; name: string }[]>([]),
    ensureParentOptionsLoaded: vi.fn(),
  };
  const mockChecklistStore = {
    checklists: signal<readonly { id: string; name: string }[]>([]),
    ensureInspectionCreateOptionsLoaded: vi.fn(),
  };

  const mockActiveInspectionStore = {
    selectedInspection: signal<InspectionOutput | null>(null),
    isLoadingInspection: signal<boolean>(false),
  };

  const mockInspectionStore = {
    nonConformities: signal<readonly NonConformityOutput[]>([]),
    isLoadingNonConformities: signal<boolean>(false),
    isAddingNonConformity: signal<boolean>(false),
    isUpdatingNonConformity: signal<boolean>(false),
    isChangingLifecycle: signal<boolean>(false),
    addNonConformityCallState: signal<{ status: string; error: unknown }>({
      status: 'idle',
      error: null,
    }),
    cancelCallState: signal<{ status: string }>({ status: 'idle' }),
    isUpdating: signal<boolean>(false),
    updateError: signal<{ message: string } | null>(null),
    update: vi.fn(),
    loadNonConformities: vi.fn(),
    submit: vi.fn(),
    close: vi.fn(),
    cancel: vi.fn(),
    addNonConformity: vi.fn(),
    updateNonConformityStatus: vi.fn(),
    loadNonConformity: vi.fn(),
  };

  const mockPermissionService = {
    hasPermission: vi.fn().mockReturnValue(true),
  };

  const mockConfirmationService = { confirm: vi.fn() };

  beforeEach(() => {
    mockActiveInspectionStore.selectedInspection.set(null);
    mockActiveInspectionStore.isLoadingInspection.set(false);
    mockInspectionStore.nonConformities.set([]);
    mockInspectionStore.isLoadingNonConformities.set(false);
    mockInspectionStore.isAddingNonConformity.set(false);
    mockInspectionStore.isUpdatingNonConformity.set(false);
    mockInspectionStore.isChangingLifecycle.set(false);
    mockInspectionStore.addNonConformityCallState.set({ status: 'idle', error: null });
    mockInspectionStore.cancelCallState.set({ status: 'idle' });
    mockInspectionStore.isUpdating.set(false);
    mockInspectionStore.updateError.set(null);
    mockInspectionStore.update.mockReset();
    mockInspectionStore.loadNonConformities.mockReset();
    mockInspectionStore.submit.mockReset();
    mockInspectionStore.close.mockReset();
    mockInspectionStore.cancel.mockReset();
    mockPermissionService.hasPermission.mockReset().mockReturnValue(true);
    mockConfirmationService.confirm.mockReset();

    TestBed.configureTestingModule({
      imports: [InspectionDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActiveInspectionStore, useValue: mockActiveInspectionStore },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: OrganizationPermissionService, useValue: mockPermissionService },
      ],
    }).overrideComponent(InspectionDetailPage, {
      set: {
        providers: [
          { provide: InspectionStore, useValue: mockInspectionStore },
          { provide: EquipmentStore, useValue: mockEquipmentStore },
          { provide: FacilityStore, useValue: mockFacilityStore },
          { provide: ChecklistStore, useValue: mockChecklistStore },
        ],
      },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeleton when loading', () => {
    mockActiveInspectionStore.isLoadingInspection.set(true);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render tab navigation when resolved', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_INSPECTION);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Overview');
    expect(fixture.nativeElement.textContent).toContain('Non-conformities');
  });

  it('should render the information panel with the resolved inspection', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_INSPECTION);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('app-inspection-information-panel'));
    expect(panel).toBeTruthy();
  });

  it('should render the non-conformities tab content when switched to tab index 1', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_INSPECTION);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    fixture.componentInstance['activeTab'].set(1);
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.css('app-non-conformity-table'));
    expect(table).toBeTruthy();
  });

  it('should show the not-found empty state when no inspection is resolved and not loading', () => {
    mockActiveInspectionStore.selectedInspection.set(null);
    mockActiveInspectionStore.isLoadingInspection.set(false);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inspection not found');
    const emptyState = fixture.debugElement.query(By.css('app-empty-state'));
    expect(emptyState).toBeTruthy();
  });

  it('should navigate back to the inspection list from the not-found empty state', () => {
    mockActiveInspectionStore.selectedInspection.set(null);
    mockActiveInspectionStore.isLoadingInspection.set(false);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const backButton = fixture.debugElement.query(By.css('p-button'));
    backButton.triggerEventHandler('onClick', undefined);

    expect(navigateSpy).toHaveBeenCalledWith(['..'], expect.anything());
  });

  it('should navigate to the list once the cancellation succeeds', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_INSPECTION);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    mockInspectionStore.cancelCallState.set({ status: 'success' });
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['..'], expect.anything());
  });

  it('should persist a property confirmed in place instead of routing to a form', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_INSPECTION);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    fixture.componentInstance['onFieldChanged']({ notes: 'Checked and cleared.' });

    expect(mockInspectionStore.update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      inspectionId: MOCK_INSPECTION.id,
      input: { notes: 'Checked and cleared.' },
    });
  });

  it('should not persist a field change when no inspection is resolved', () => {
    mockActiveInspectionStore.selectedInspection.set(null);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    fixture.componentInstance['onFieldChanged']({ notes: 'Should not persist.' });

    expect(mockInspectionStore.update).not.toHaveBeenCalled();
  });

  it('should allow field edits for a draft inspection when the member can manage inspections', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_INSPECTION);
    mockPermissionService.hasPermission.mockReturnValue(true);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    expect(fixture.componentInstance['canEditFields']()).toBe(true);
  });

  it('should gate field edits on the draft-only lifecycle invariant, even with write permission', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_SUBMITTED_INSPECTION);
    mockPermissionService.hasPermission.mockReturnValue(true);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    expect(fixture.componentInstance['canEditFields']()).toBe(false);
  });

  it('should gate field edits on the INSPECTION_WRITE permission, even for a draft', () => {
    mockActiveInspectionStore.selectedInspection.set(MOCK_INSPECTION);
    mockPermissionService.hasPermission.mockReturnValue(false);
    const fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    expect(fixture.componentInstance['canEditFields']()).toBe(false);
  });
});
