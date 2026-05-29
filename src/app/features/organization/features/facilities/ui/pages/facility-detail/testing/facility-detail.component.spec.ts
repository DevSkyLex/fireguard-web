import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityStore,
} from '@features/organization/features/facilities/state';
import {
  FacilityEquipmentTab,
  FacilityInspectionTab,
} from '@features/organization/features/facilities/ui/components';
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
    ensureParentOptionsLoaded: vi.fn(),
    move: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };
  const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
  const mockMessageService = { add: vi.fn() };

  const mockEquipmentStore = {
    equipmentList: signal([]),
    isLoadingEquipment: signal(false),
    isEmpty: signal(true),
    load: vi.fn(),
  };

  const mockInspectionStore = {
    inspections: signal([]),
    isLoadingInspections: signal(false),
    isEmpty: signal(true),
    load: vi.fn(),
  };

  beforeEach(() => {
    mockActiveFacilityStore.selectedFacility.set(null);
    mockActiveFacilityStore.isLoadingFacility.set(false);
    mockFacilityStore.facilities.set([]);
    mockFacilityStore.moveCallState.set({ status: 'idle', data: null });
    mockFacilityStore.ensureParentOptionsLoaded.mockReset();
    mockFacilityStore.move.mockReset();
    mockEquipmentStore.load.mockReset();
    mockInspectionStore.load.mockReset();
    mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);

    TestBed.configureTestingModule({
      imports: [FacilityDetailPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    })
      .overrideComponent(FacilityDetailPage, {
        set: { providers: [{ provide: FacilityStore, useValue: mockFacilityStore }] },
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
      ],
    })
      .overrideComponent(FacilityDetailPage, {
        set: { providers: [{ provide: FacilityStore, useValue: mockFacilityStore }] },
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
