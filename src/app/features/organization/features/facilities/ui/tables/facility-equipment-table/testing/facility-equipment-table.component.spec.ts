import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TableLazyLoadEvent } from 'primeng/table';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityEquipmentTable } from '../facility-equipment-table.component';

const MOCK_EQUIPMENT: EquipmentOutput = {
  '@id': '/api/organizations/org-1/equipments/eq-1',
  '@type': 'Equipment',
  id: 'eq-1',
  organizationId: 'org-1',
  facilityId: 'fac-1',
  type: 'extinguisher',
  subType: 'water',
  brand: 'Acme',
  model: 'A-100',
  serialNumber: 'SN-001',
  locationLabel: 'Lobby',
  status: 'operational',
  installedAt: '2025-01-01',
  commissionedAt: '2025-01-02',
  tags: [],
  createdAt: '2025-01-01',
  updatedAt: '2025-01-03',
} as EquipmentOutput;

describe('FacilityEquipmentTable', () => {
  beforeAll(() => {
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
  });

  const createComponent = (overrides?: {
    equipments?: readonly EquipmentOutput[];
    total?: number;
    loading?: boolean;
    empty?: boolean;
    canManage?: boolean;
  }) => {
    TestBed.configureTestingModule({
      imports: [FacilityEquipmentTable],
      providers: [
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: vi.fn(() => overrides?.canManage ?? true),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(FacilityEquipmentTable);
    fixture.componentRef.setInput('equipments', overrides?.equipments ?? []);
    fixture.componentRef.setInput('total', overrides?.total ?? 0);
    fixture.componentRef.setInput('loading', overrides?.loading ?? false);
    fixture.componentRef.setInput('empty', overrides?.empty ?? true);
    fixture.detectChanges();
    return fixture;
  };

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render equipment rows', () => {
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('Extinguisher / Water');
    expect(fixture.nativeElement.textContent).toContain('Acme A-100');
    expect(fixture.nativeElement.textContent).toContain('Operational');
  });

  it('should render an empty message when there are no equipments', () => {
    const fixture = createComponent({ equipments: [], total: 0, empty: true });
    expect(fixture.nativeElement.textContent).toContain('No equipments found');
  });

  it('should show skeleton placeholders while loading', () => {
    const fixture = createComponent({ loading: true });
    const skeleton = fixture.debugElement.query(By.css('.p-skeleton'));
    expect(skeleton).toBeTruthy();
  });

  it('should emit a load request with the resolved page', () => {
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const spy = vi.fn();
    fixture.componentInstance.load.subscribe(spy);

    fixture.componentInstance.onLazyLoad({ first: 24, rows: 12 } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith({
      page: 3,
      itemsPerPage: 12,
      params: {},
    });
  });

  it('should emit pageChange on user-driven lazy loads after init', () => {
    const fixture = createComponent();
    const spy = vi.fn();
    fixture.componentInstance.pageChange.subscribe(spy);

    fixture.componentInstance.onLazyLoad({ first: 12, rows: 12 } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith(2);
  });

  it('should emit add when the toolbar button is clicked', () => {
    const fixture = createComponent({ canManage: true });
    const spy = vi.fn();
    fixture.componentInstance.add.subscribe(spy);

    const splitButton = fixture.debugElement.query(By.css('p-splitbutton'));
    splitButton.triggerEventHandler('onClick', {});

    expect(spy).toHaveBeenCalled();
  });

  it('should keep read-only toolbar actions visible without write permission', () => {
    const fixture = createComponent({ canManage: false });

    expect(fixture.nativeElement.textContent).toContain('Refresh');
    expect(fixture.nativeElement.textContent).toContain('Clear filters');
    expect(fixture.debugElement.query(By.css('p-splitbutton'))).toBeNull();
    expect(fixture.debugElement.query(By.css('p-tableheadercheckbox'))).toBeNull();
  });
});
