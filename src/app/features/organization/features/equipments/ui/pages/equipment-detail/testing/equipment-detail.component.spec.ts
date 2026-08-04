import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
} from '@features/organization/features/equipments/state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { EquipmentDetailPage } from '../equipment-detail.component';

const MOCK_EQUIPMENT: EquipmentOutput = {
  '@id': '/api/equipment/eq-1',
  '@type': 'Equipment',
  id: 'eq-1',
  organizationId: 'org-1',
  facilityId: 'fac-1',
  type: 'fire_extinguisher',
  subType: null,
  brand: 'Kidde',
  model: 'Pro 210',
  serialNumber: 'SN-1',
  locationLabel: null,
  status: 'operational',
  installedAt: null,
  commissionedAt: null,
  tags: [],
  createdAt: '2025-01-01',
  updatedAt: '2025-06-01',
} as unknown as EquipmentOutput;

describe('EquipmentDetailPage', () => {
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

  const mockActiveEquipmentStore = {
    selectedEquipment: signal<EquipmentOutput | null>(null),
    isLoadingEquipment: signal<boolean>(false),
  };

  const mockEquipmentStore = {
    isChangingLifecycle: signal<boolean>(false),
    assignToFacilityCallState: signal<{ status: string }>({ status: 'idle' }),
    unassignFromFacilityCallState: signal<{ status: string }>({ status: 'idle' }),
    addTagCallState: signal<{ status: string }>({ status: 'idle' }),
    removeTagCallState: signal<{ status: string }>({ status: 'idle' }),
    attachments: signal<readonly unknown[]>([]),
    isLoadingAttachments: signal<boolean>(false),
    addAttachmentCallState: signal<{ status: string; error: unknown }>({
      status: 'idle',
      error: null,
    }),
    deleteAttachmentCallState: signal<{ status: string }>({ status: 'idle' }),
    maintenanceLogs: signal<readonly unknown[]>([]),
    isLoadingMaintenanceLogs: signal<boolean>(false),
    isUpdating: signal<boolean>(false),
    updateError: signal<{ message?: string } | null>(null),
    update: vi.fn(),
    loadAttachments: vi.fn(),
    loadMaintenanceLogs: vi.fn(),
    assignToFacility: vi.fn(),
    unassignFromFacility: vi.fn(),
    commission: vi.fn(),
    maintenance: vi.fn(),
    decommission: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    addAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
  };

  const mockFacilityStore = {
    facilities: signal<readonly FacilityOutput[]>([]),
    ensureParentOptionsLoaded: vi.fn(),
  };

  const mockConfirmationService = { confirm: vi.fn() };

  beforeEach(() => {
    mockActiveEquipmentStore.selectedEquipment.set(null);
    mockActiveEquipmentStore.isLoadingEquipment.set(false);
    mockEquipmentStore.isUpdating.set(false);
    mockEquipmentStore.updateError.set(null);
    mockEquipmentStore.update.mockReset();
    mockEquipmentStore.loadAttachments.mockReset();
    mockEquipmentStore.loadMaintenanceLogs.mockReset();
    mockFacilityStore.facilities.set([]);
    mockFacilityStore.ensureParentOptionsLoaded.mockReset();
    mockConfirmationService.confirm.mockReset();

    TestBed.configureTestingModule({
      imports: [EquipmentDetailPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActiveEquipmentStore, useValue: mockActiveEquipmentStore },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => true },
        },
      ],
    }).overrideComponent(EquipmentDetailPage, {
      set: {
        providers: [
          { provide: EquipmentStore, useValue: mockEquipmentStore },
          { provide: FacilityStore, useValue: mockFacilityStore },
        ],
      },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeleton when loading', () => {
    mockActiveEquipmentStore.isLoadingEquipment.set(true);
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render the equipment detail header once resolved', () => {
    mockActiveEquipmentStore.selectedEquipment.set(MOCK_EQUIPMENT);
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    const header = fixture.debugElement.query(By.css('app-equipment-detail-header'));
    expect(header).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('SN-1');
  });

  it('should persist a property confirmed in place instead of routing to a form', () => {
    mockActiveEquipmentStore.selectedEquipment.set(MOCK_EQUIPMENT);
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    fixture.componentInstance['onFieldChanged']({ brand: 'Amerex' });

    expect(mockEquipmentStore.update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: MOCK_EQUIPMENT.id,
      input: { brand: 'Amerex' },
    });
  });

  it('should not persist when no equipment is resolved yet', () => {
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    fixture.componentInstance['onFieldChanged']({ brand: 'Amerex' });

    expect(mockEquipmentStore.update).not.toHaveBeenCalled();
  });

  it('should show the not-found empty state without rendering the tabs when no equipment is resolved and not loading', () => {
    mockActiveEquipmentStore.selectedEquipment.set(null);
    mockActiveEquipmentStore.isLoadingEquipment.set(false);
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Equipment not found');
    const emptyState = fixture.debugElement.query(By.css('app-empty-state'));
    expect(emptyState).toBeTruthy();
    expect(fixture.debugElement.query(By.css('p-tabs'))).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Attachments');
  });

  it('should navigate back to the equipment list from the not-found empty state', () => {
    mockActiveEquipmentStore.selectedEquipment.set(null);
    mockActiveEquipmentStore.isLoadingEquipment.set(false);
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const backButton = fixture.debugElement.query(By.css('p-button'));
    backButton.triggerEventHandler('onClick', undefined);

    expect(navigateSpy).toHaveBeenCalledWith(['/organizations', 'org-1', 'equipments']);
  });

  it('should render the tabs once equipment resolves', () => {
    mockActiveEquipmentStore.selectedEquipment.set(MOCK_EQUIPMENT);
    const fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('p-tabs'))).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Attachments');
  });
});
