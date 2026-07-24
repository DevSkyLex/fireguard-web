import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EMPTY, of } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityOverviewStore,
  FacilityStore,
} from '@features/organization/features/facilities/state';
import {
  FacilityEquipmentTab,
  FacilityInspectionTab,
} from '@features/organization/features/facilities/ui/components';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import { InspectionStore } from '@features/organization/features/inspections/state';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { FacilityDetailPage } from '../facility-detail.component';

const MOCK_ORG: OrganizationOutput = {
  id: 'org-1',
  name: 'Acme Corp',
} as OrganizationOutput;

const MOCK_FACILITY: FacilityOutput = {
  '@id': '/api/facilities/fac-1',
  '@type': 'Facility',
  id: 'fac-1',
  organizationId: 'org-1',
  name: 'Main Site',
  type: 'site',
  status: 'active',
  code: 'SITE-01',
  address: null,
  parentFacilityId: null,
  hasChildren: false,
  metadata: {},
  createdAt: '2025-01-01',
  updatedAt: '2025-06-01',
} as unknown as FacilityOutput;

const MOCK_FACILITY_WITH_CHILDREN: FacilityOutput = {
  ...MOCK_FACILITY,
  hasChildren: true,
} as unknown as FacilityOutput;

describe('FacilityDetailPage', () => {
  beforeAll(() => {
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

  const mockActiveFacilityStore = {
    selectedFacility: signal<FacilityOutput | null>(null),
    isLoadingFacility: signal<boolean>(false),
  };

  const mockFacilityStore = {
    facilities: signal<readonly FacilityOutput[]>([]),
    moveCallState: signal<{ status: string; data: FacilityOutput | null }>({
      status: 'idle',
      data: null,
    }),
    childFacilitiesByParent: signal<Record<string, readonly FacilityOutput[]>>({}),
    childFacilityIdsByParent: signal<Record<string, readonly string[]>>({}),
    loadedParentIds: signal<readonly string[]>([]),
    loadingParentIds: signal<readonly string[]>([]),
    deleteCallState: signal<{ status: string }>({ status: 'idle' }),
    ensureParentOptionsLoaded: vi.fn(),
    ensureChildFacilitiesLoaded: vi.fn(),
    ensureFacilityDescendantsLoaded: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };
  const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
  const mockMessageService = { add: vi.fn() };
  const mockConfirmationService = { confirm: vi.fn() };

  const mockEquipmentService = {
    list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
  };

  const mockInspectionService = {
    list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
  };

  const mockEquipmentStore = {
    equipmentList: signal([]),
    isLoadingEquipment: signal(false),
    isEmpty: signal(true),
    totalEquipment: signal(0),
    load: vi.fn(),
  };

  const mockInspectionStore = {
    inspections: signal([]),
    isLoadingInspections: signal(false),
    isEmpty: signal(true),
    totalInspections: signal(0),
    load: vi.fn(),
  };

  beforeEach(() => {
    mockActiveFacilityStore.selectedFacility.set(null);
    mockActiveFacilityStore.isLoadingFacility.set(false);
    mockFacilityStore.facilities.set([]);
    mockFacilityStore.moveCallState.set({ status: 'idle', data: null });
    mockFacilityStore.childFacilitiesByParent.set({});
    mockFacilityStore.childFacilityIdsByParent.set({});
    mockFacilityStore.loadedParentIds.set([]);
    mockFacilityStore.loadingParentIds.set([]);
    mockFacilityStore.ensureParentOptionsLoaded.mockReset();
    mockFacilityStore.ensureChildFacilitiesLoaded.mockReset();
    mockFacilityStore.ensureFacilityDescendantsLoaded.mockReset();
    mockFacilityStore.move.mockReset();
    mockFacilityStore.remove.mockReset();
    mockFacilityStore.deleteCallState.set({ status: 'idle' });
    mockEquipmentStore.load.mockReset();
    mockInspectionStore.load.mockReset();
    mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);
    mockEquipmentService.list.mockReset();
    mockEquipmentService.list.mockReturnValue(of({ member: [], totalItems: 0 }));
    mockInspectionService.list.mockReset();
    mockInspectionService.list.mockReturnValue(of({ member: [], totalItems: 0 }));

    TestBed.configureTestingModule({
      imports: [FacilityDetailPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: InspectionService, useValue: mockInspectionService },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => true },
        },
      ],
    })
      .overrideComponent(FacilityDetailPage, {
        set: {
          providers: [
            { provide: FacilityStore, useValue: mockFacilityStore },
            FacilityOverviewStore,
          ],
        },
      })
      .overrideComponent(FacilityEquipmentTab, {
        set: { providers: [{ provide: EquipmentStore, useValue: mockEquipmentStore }] },
      })
      .overrideComponent(FacilityInspectionTab, {
        set: { providers: [{ provide: InspectionStore, useValue: mockInspectionStore }] },
      });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeleton when loading', () => {
    mockActiveFacilityStore.isLoadingFacility.set(true);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display the facility name when resolved', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Main Site');
  });

  it('should display the facility code when present', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SITE-01');
  });

  it('should render tab navigation', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Overview');
    expect(fixture.nativeElement.textContent).toContain('Equipments');
    expect(fixture.nativeElement.textContent).toContain('Inspections');
  });

  it('should not load secondary tab data on initial render', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    expect(mockEquipmentStore.load).not.toHaveBeenCalled();
    expect(mockInspectionStore.load).not.toHaveBeenCalled();
  });

  it('should not load child facilities when the facility has no children', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    expect(mockFacilityStore.ensureChildFacilitiesLoaded).not.toHaveBeenCalled();
    expect(mockFacilityStore.ensureFacilityDescendantsLoaded).not.toHaveBeenCalled();
  });

  it('should eagerly load descendants when the facility has children', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY_WITH_CHILDREN);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    expect(mockFacilityStore.ensureFacilityDescendantsLoaded).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'fac-1',
    });
  });

  it('should navigate to a facility chosen from the installations panel', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY_WITH_CHILDREN);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const child = { ...MOCK_FACILITY, id: 'fac-2' } as unknown as FacilityOutput;
    fixture.componentInstance['onNavigateToFacility'](child);

    expect(navigateSpy).toHaveBeenCalledWith(['..', '..', 'fac-2'], expect.anything());
  });

  it('should open the move dialog when onOpenMoveDialog is called', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['onOpenMoveDialog']();
    fixture.detectChanges();

    expect(fixture.componentInstance['showMoveDialog']()).toBe(true);
    expect(mockFacilityStore.ensureParentOptionsLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should close the move dialog when onMoveCancel is called', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['onOpenMoveDialog']();
    fixture.detectChanges();
    fixture.componentInstance['onMoveCancel']();
    fixture.detectChanges();

    expect(fixture.componentInstance['showMoveDialog']()).toBe(false);
  });

  it('should exclude self, descendants and archived facilities from move parent options', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    mockFacilityStore.facilities.set([
      MOCK_FACILITY,
      { ...MOCK_FACILITY, id: 'fac-2', name: 'Valid Parent' } as unknown as FacilityOutput,
      {
        ...MOCK_FACILITY,
        id: 'fac-3',
        name: 'Archived',
        status: 'archived',
      } as unknown as FacilityOutput,
      { ...MOCK_FACILITY, id: 'fac-4', name: 'Descendant' } as unknown as FacilityOutput,
    ]);
    mockFacilityStore.childFacilityIdsByParent.set({ 'fac-1': ['fac-4'] });

    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    const optionValues: string[] = fixture.componentInstance['parentOptions']().map(
      (option) => option.value,
    );

    expect(optionValues).toContain('');
    expect(optionValues).toContain('fac-2');
    expect(optionValues).not.toContain('fac-1');
    expect(optionValues).not.toContain('fac-3');
    expect(optionValues).not.toContain('fac-4');
  });

  it('should call store.move with correct payload on onMoveSubmit', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['moveParentId'].set('fac-99');
    fixture.componentInstance['onMoveSubmit']();

    expect(mockFacilityStore.move).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'fac-1',
      input: { parentFacilityId: 'fac-99' },
    });
  });

  it('should pass null parentFacilityId when moving to root', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['moveParentId'].set('');
    fixture.componentInstance['onMoveSubmit']();

    expect(mockFacilityStore.move).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'fac-1',
      input: { parentFacilityId: null },
    });
  });

  it('should show the not-found empty state when no facility is resolved and not loading', () => {
    mockActiveFacilityStore.selectedFacility.set(null);
    mockActiveFacilityStore.isLoadingFacility.set(false);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility not found');
    const emptyState = fixture.debugElement.query(By.css('app-empty-state'));
    expect(emptyState).toBeTruthy();
  });

  it('should navigate back to the facility list from the not-found empty state', () => {
    mockActiveFacilityStore.selectedFacility.set(null);
    mockActiveFacilityStore.isLoadingFacility.set(false);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const backButton = fixture.debugElement.query(By.css('p-button'));
    backButton.triggerEventHandler('onClick', undefined);

    expect(navigateSpy).toHaveBeenCalledWith(['..', '..'], expect.anything());
  });

  it('should render the equipments tab content when switched to tab index 1', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['activeTab'].set(1);
    fixture.detectChanges();

    const equipmentTab = fixture.debugElement.query(By.css('app-facility-equipment-tab'));
    expect(equipmentTab).toBeTruthy();
  });

  it('should render the inspections tab content when switched to tab index 2', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['activeTab'].set(2);
    fixture.detectChanges();

    const inspectionTab = fixture.debugElement.query(By.css('app-facility-inspection-tab'));
    expect(inspectionTab).toBeTruthy();
  });

  it('should render the move dialog select with parent options when opened', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    mockFacilityStore.facilities.set([
      MOCK_FACILITY,
      { ...MOCK_FACILITY, id: 'fac-2', name: 'Valid Parent' } as unknown as FacilityOutput,
    ]);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['onOpenMoveDialog']();
    fixture.detectChanges();

    const select = fixture.debugElement.query(By.css('p-select'));
    expect(select).toBeTruthy();
  });

  it('should disable the move dialog select and cancel button while a move is pending', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    mockFacilityStore.moveCallState.set({ status: 'pending', data: null });
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['onOpenMoveDialog']();
    fixture.detectChanges();

    expect(fixture.componentInstance['isMoving']()).toBe(true);
  });

  it('should confirm and delete the facility when the delete action is accepted', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    mockConfirmationService.confirm.mockImplementation((options: { accept?: () => void }): void => {
      options.accept?.();
    });
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['onConfirmDelete']();

    expect(mockConfirmationService.confirm).toHaveBeenCalled();
    expect(mockFacilityStore.remove).toHaveBeenCalledWith({ facilityId: 'fac-1' });
  });

  it('should not delete the facility when the confirmation is not accepted', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    mockConfirmationService.confirm.mockImplementation((): void => {
      // Simulate the user rejecting the confirm dialog: accept is never invoked.
    });
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    fixture.componentInstance['onConfirmDelete']();

    expect(mockFacilityStore.remove).not.toHaveBeenCalled();
  });

  it('should navigate back to the facility list once the delete succeeds', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    mockFacilityStore.deleteCallState.set({ status: 'success' });
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['..', '..'], expect.anything());
  });

  it('should navigate to the edit page when onEdit is called', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['onEdit']();

    expect(navigateSpy).toHaveBeenCalledWith(['edit'], expect.anything());
  });

  it('should gate header management actions on the FACILITIES_WRITE permission', () => {
    TestBed.resetTestingModule();
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);

    TestBed.configureTestingModule({
      imports: [FacilityDetailPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: InspectionService, useValue: mockInspectionService },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => false },
        },
      ],
    })
      .overrideComponent(FacilityDetailPage, {
        set: {
          providers: [
            { provide: FacilityStore, useValue: mockFacilityStore },
            FacilityOverviewStore,
          ],
        },
      })
      .overrideComponent(FacilityEquipmentTab, {
        set: { providers: [{ provide: EquipmentStore, useValue: mockEquipmentStore }] },
      })
      .overrideComponent(FacilityInspectionTab, {
        set: { providers: [{ provide: InspectionStore, useValue: mockInspectionStore }] },
      });

    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();

    expect(fixture.componentInstance['canManage']()).toBe(false);
  });

  it('should not load move dialog parent options during SSR', () => {
    TestBed.resetTestingModule();
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);

    TestBed.configureTestingModule({
      imports: [FacilityDetailPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: InspectionService, useValue: mockInspectionService },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => true },
        },
      ],
    })
      .overrideComponent(FacilityDetailPage, {
        set: {
          providers: [
            { provide: FacilityStore, useValue: mockFacilityStore },
            FacilityOverviewStore,
          ],
        },
      })
      .overrideComponent(FacilityEquipmentTab, {
        set: { providers: [{ provide: EquipmentStore, useValue: mockEquipmentStore }] },
      })
      .overrideComponent(FacilityInspectionTab, {
        set: { providers: [{ provide: InspectionStore, useValue: mockInspectionStore }] },
      });

    const fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.detectChanges();
    fixture.componentInstance['onOpenMoveDialog']();

    expect(mockFacilityStore.ensureParentOptionsLoaded).not.toHaveBeenCalled();
  });
});
