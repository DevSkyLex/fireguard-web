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
    expect(fixture.nativeElement.textContent).toContain('No equipment found');
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

  it('should render the reference as a fallback when brand and model are missing', () => {
    const fixture = createComponent({
      equipments: [{ ...MOCK_EQUIPMENT, brand: null, model: null } as EquipmentOutput],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('No reference');
  });

  it('should render the serial number and location dashes when absent', () => {
    const fixture = createComponent({
      equipments: [
        {
          ...MOCK_EQUIPMENT,
          serialNumber: null,
          locationLabel: null,
          installedAt: null,
        } as EquipmentOutput,
      ],
      total: 1,
      empty: false,
    });

    const codes = fixture.nativeElement.querySelectorAll('code');
    expect(codes.length).toBe(0);
  });

  it('should toggle the action menu and store the targeted equipment', () => {
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const actionMenu = component['actionMenu' as never] as unknown as () => {
      toggle: (event: Event) => void;
    };
    const toggleSpy = vi.spyOn(actionMenu(), 'toggle');
    const event = new MouseEvent('click');

    component['onActionMenuToggle'](event, MOCK_EQUIPMENT);

    expect(toggleSpy).toHaveBeenCalledWith(event);
  });

  it('should expose view and edit action menu items with manage permission', () => {
    const fixture = createComponent({ canManage: true });
    const component = fixture.componentInstance;
    component['onActionMenuToggle'](new MouseEvent('click'), MOCK_EQUIPMENT);

    const items = component['actionMenuItems']();

    expect(items.some((item) => item.label === 'View')).toBe(true);
    expect(items.some((item) => item.label === 'Edit')).toBe(true);
  });

  it('should only expose the view action without manage permission', () => {
    const fixture = createComponent({ canManage: false });
    const component = fixture.componentInstance;
    component['onActionMenuToggle'](new MouseEvent('click'), MOCK_EQUIPMENT);

    const items = component['actionMenuItems']();

    expect(items).toHaveLength(1);
    expect(items[0]?.label).toBe('View');
  });

  it('should return no action menu items when nothing is targeted', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance['actionMenuItems']()).toEqual([]);
  });

  it('should emit view and edit from the action menu commands', () => {
    const fixture = createComponent({ canManage: true });
    const component = fixture.componentInstance;
    const viewSpy = vi.fn();
    const editSpy = vi.fn();
    component.view.subscribe(viewSpy);
    component.edit.subscribe(editSpy);
    component['onActionMenuToggle'](new MouseEvent('click'), MOCK_EQUIPMENT);

    const items = component['actionMenuItems']();
    items.find((item) => item.label === 'View')?.command?.({} as never);
    items.find((item) => item.label === 'Edit')?.command?.({} as never);

    expect(viewSpy).toHaveBeenCalledWith(MOCK_EQUIPMENT);
    expect(editSpy).toHaveBeenCalledWith(MOCK_EQUIPMENT);
  });

  it('should clear the selection and reload on onClearFilters', () => {
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component.onLazyLoad({ first: 0, rows: 12 } as TableLazyLoadEvent);
    component['selectedEquipments'].set([MOCK_EQUIPMENT]);
    component['searchControl'].setValue('acme', { emitEvent: false });
    component['statusControl'].setValue('operational', { emitEvent: false });

    component['onClearFilters']();

    expect(component['searchControl'].value).toBe('');
    expect(component['statusControl'].value).toBeNull();
    expect(component['selectedEquipments']()).toEqual([]);
  });

  it('should include the search and status params in the load request', () => {
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.load.subscribe(spy);
    component['searchControl'].setValue('acme', { emitEvent: false });
    component['statusControl'].setValue('operational', { emitEvent: false });

    component.onLazyLoad({ first: 0, rows: 12 } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ search: 'acme', status: 'operational' }),
      }),
    );
  });

  it('should include sort parameters in the load request', () => {
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.load.subscribe(spy);

    component.onLazyLoad({
      first: 0,
      rows: 12,
      sortField: 'status',
      sortOrder: -1,
    } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ 'order[status]': 'desc' }) }),
    );
  });

  it('should clear selection when a subsequent lazy-load event targets a different dataset', () => {
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component.onLazyLoad({ first: 0, rows: 12 } as TableLazyLoadEvent);
    component['selectedEquipments'].set([MOCK_EQUIPMENT]);

    component.onLazyLoad({ first: 12, rows: 12 } as TableLazyLoadEvent);

    expect(component['selectedEquipments']()).toEqual([]);
  });

  it('should reload when the status filter changes', () => {
    vi.useFakeTimers();
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component.onLazyLoad({ first: 24, rows: 12 } as TableLazyLoadEvent);
    const spy = vi.fn();
    component.load.subscribe(spy);

    component['statusControl'].setValue('operational');

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ status: 'operational' }) }),
    );
    vi.useRealTimers();
  });

  it('should reload when the search control changes after debounce', () => {
    vi.useFakeTimers();
    const fixture = createComponent({
      equipments: [MOCK_EQUIPMENT],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.load.subscribe(spy);

    component['searchControl'].setValue('acme');
    vi.advanceTimersByTime(400);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ search: 'acme' }) }),
    );
    vi.useRealTimers();
  });

  it('should disable search and status controls while loading', () => {
    const fixture = createComponent({ loading: true });
    const component = fixture.componentInstance;

    expect(component['searchControl'].disabled).toBe(true);
    expect(component['statusControl'].disabled).toBe(true);
  });

  it('should resolve the status descriptor for an equipment status', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance['getStatusOption']('operational')).toBeTruthy();
  });

  it('should restore the initial page on init', () => {
    TestBed.configureTestingModule({
      imports: [FacilityEquipmentTable],
      providers: [
        { provide: OrganizationPermissionService, useValue: { hasPermission: vi.fn(() => true) } },
      ],
    });
    const fixture = TestBed.createComponent(FacilityEquipmentTable);
    fixture.componentRef.setInput('equipments', []);
    fixture.componentRef.setInput('total', 0);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('initialPage', 4);

    fixture.detectChanges();

    expect(fixture.componentInstance['firstPage']()).toBe(36);
  });

  it('should show the empty-state action button to create equipment when permitted', () => {
    const fixture = createComponent({ canManage: true, equipments: [], total: 0, empty: true });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('New equipment');
  });
});
