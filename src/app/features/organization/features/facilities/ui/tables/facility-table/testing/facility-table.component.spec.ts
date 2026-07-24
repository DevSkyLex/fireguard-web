import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TableLazyLoadEvent } from 'primeng/table';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityTable } from '../facility-table.component';

const MOCK_FACILITY: FacilityOutput = {
  id: 'fac-1',
  organizationId: 'org-1',
  name: 'Main Site',
  type: 'site',
  status: 'active',
  code: 'S-1',
  parentFacilityId: null,
  hasChildren: false,
  address: '1 Main Street',
  metadata: {},
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as FacilityOutput;

describe('FacilityTable', () => {
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
    facilities?: readonly FacilityOutput[];
    total?: number;
    loading?: boolean;
    empty?: boolean;
    canManage?: boolean;
  }) => {
    TestBed.configureTestingModule({
      imports: [FacilityTable],
      providers: [
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: vi.fn(() => overrides?.canManage ?? true),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(FacilityTable);
    fixture.componentRef.setInput('facilities', overrides?.facilities ?? []);
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

  it('should render facility names', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('Main Site');
  });

  it('should render an empty message when there are no facilities', () => {
    const fixture = createComponent({ facilities: [], total: 0, empty: true });
    expect(fixture.nativeElement.textContent).toContain('No facilities yet');
  });

  // PrimeNG picks the template per row: a falsy `rowData` renders
  // `loadingbody`, a truthy one renders `body` (primeng-table.mjs, the
  // `rowData ? template : loadingBodyTemplate` outlet). `skeletonItems` is
  // therefore a sparse array on purpose, and `loadingbody` must emit ONE
  // `<tr>` — iterating `skeletonItems` inside it renders rows squared.
  it('should render exactly one skeleton row per placeholder while loading', () => {
    const fixture = createComponent({ loading: true });

    const skeletonRows = fixture.debugElement
      .queryAll(By.css('tbody tr'))
      .filter((row) => row.query(By.css('.p-skeleton')) !== null);

    expect(skeletonRows).toHaveLength(12);
  });

  it('should emit a load request with the resolved page', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const spy = vi.fn();
    fixture.componentInstance.load.subscribe(spy);

    fixture.componentInstance.onLazyLoad({ first: 60, rows: 30 } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith({
      page: 3,
      itemsPerPage: 30,
      params: {},
    });
  });

  it('should emit pageChange on user-driven lazy loads after init', () => {
    const fixture = createComponent();
    const spy = vi.fn();
    fixture.componentInstance.pageChange.subscribe(spy);

    fixture.componentInstance.onLazyLoad({ first: 30, rows: 30 } as TableLazyLoadEvent);

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
  });

  it('should resolve the status descriptor and type icon for a facility', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['getStatusOption']('active')).toBeTruthy();
    expect(component['getTypeIcon']('site')).toBeTruthy();
  });

  it('should format the children indicator label', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['getChildrenLabel']({ ...MOCK_FACILITY, hasChildren: true })).toBe(
      'Has children',
    );
    expect(component['getChildrenLabel']({ ...MOCK_FACILITY, hasChildren: false })).toBe('Leaf');
  });

  it('should clear the selection without reloading', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const loadSpy = vi.fn();
    component.load.subscribe(loadSpy);
    component['selectedFacilities'].set([MOCK_FACILITY]);

    component['onClearSelection']();

    expect(component['selectedFacilities']()).toEqual([]);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should not emit bulkArchive when no facility is selected', () => {
    const fixture = createComponent({ canManage: true });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.bulkArchive.subscribe(spy);

    component['onBulkArchive']();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should not emit bulkArchive without manage permission even with a selection', () => {
    const fixture = createComponent({ canManage: false });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.bulkArchive.subscribe(spy);
    component['selectedFacilities'].set([MOCK_FACILITY]);

    component['onBulkArchive']();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit bulkArchive with the selected facilities when permitted', () => {
    const fixture = createComponent({ canManage: true });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.bulkArchive.subscribe(spy);
    component['selectedFacilities'].set([MOCK_FACILITY]);

    component['onBulkArchive']();

    expect(spy).toHaveBeenCalledWith([MOCK_FACILITY]);
  });

  it('should toggle the row menu and store the targeted facility', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const rowMenu = component['rowMenu' as never] as unknown as () => {
      toggle: (event: Event) => void;
    };
    const toggleSpy = vi.spyOn(rowMenu(), 'toggle');
    const event = new MouseEvent('click');

    component['onRowMenuToggle'](event, MOCK_FACILITY);

    expect(component['selectedFacility' as never]).toBeDefined();
    expect(toggleSpy).toHaveBeenCalledWith(event);
  });

  it('should expose view and edit row menu actions for a selected facility with manage permission', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
      canManage: true,
    });
    const component = fixture.componentInstance;
    component['onRowMenuToggle'](new MouseEvent('click'), MOCK_FACILITY);

    const items = component['rowMenuItems']();

    expect(items.some((item) => item.label === 'View')).toBe(true);
    expect(items.some((item) => item.label === 'Edit')).toBe(true);
    expect(items.some((item) => item.label === 'Archive')).toBe(true);
  });

  it('should expose a restore action for an archived facility', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
      canManage: true,
    });
    const component = fixture.componentInstance;
    component['onRowMenuToggle'](new MouseEvent('click'), { ...MOCK_FACILITY, status: 'archived' });

    const items = component['rowMenuItems']();

    expect(items.some((item) => item.label === 'Restore')).toBe(true);
  });

  it('should only expose the view action without manage permission', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
      canManage: false,
    });
    const component = fixture.componentInstance;
    component['onRowMenuToggle'](new MouseEvent('click'), MOCK_FACILITY);

    const items = component['rowMenuItems']();

    expect(items).toHaveLength(1);
    expect(items[0]?.label).toBe('View');
  });

  it('should return no row menu items when no facility is targeted yet', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['rowMenuItems']()).toEqual([]);
  });

  it('should emit view and edit from the row menu commands', () => {
    const fixture = createComponent({ canManage: true });
    const component = fixture.componentInstance;
    const viewSpy = vi.fn();
    const editSpy = vi.fn();
    component.view.subscribe(viewSpy);
    component.edit.subscribe(editSpy);
    component['onRowMenuToggle'](new MouseEvent('click'), MOCK_FACILITY);

    const items = component['rowMenuItems']();
    items.find((item) => item.label === 'View')?.command?.({} as never);
    items.find((item) => item.label === 'Edit')?.command?.({} as never);

    expect(viewSpy).toHaveBeenCalledWith(MOCK_FACILITY);
    expect(editSpy).toHaveBeenCalledWith(MOCK_FACILITY);
  });

  it('should apply column filters and update the active filter count', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const table = component['table' as never] as unknown as () => {
      filter: (...args: unknown[]) => void;
    };
    const filterSpy = vi.spyOn(table(), 'filter');
    component['statusControl'].setValue('active');
    component['typeControl'].setValue('site');
    component['codeControl'].setValue('S-1');

    component['onApplyColumnFilters']();

    expect(filterSpy).toHaveBeenCalledWith('active', 'status', 'equals');
    expect(filterSpy).toHaveBeenCalledWith('site', 'type', 'equals');
    expect(filterSpy).toHaveBeenCalledWith('S-1', 'code', 'equals');
    expect(component['filterBadge']()).toBe('3');
  });

  it('should reset column filters and clear the filter badge', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component['statusControl'].setValue('active');
    component['onApplyColumnFilters']();
    expect(component['filterBadge']()).toBe('1');

    component['onResetColumnFilters']();

    expect(component['filterBadge']()).toBeUndefined();
    expect(component['statusControl'].value).toBeNull();
  });

  it('should toggle the filter popover', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const popover = component['filterPopover' as never] as unknown as () => {
      toggle: (event: Event) => void;
    };
    const toggleSpy = vi.spyOn(popover(), 'toggle');
    const event = new MouseEvent('click');

    component['onFilterToggle'](event);

    expect(toggleSpy).toHaveBeenCalledWith(event);
  });

  it('should clear search and filters together on onClearFilters', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component['searchControl'].setValue('main', { emitEvent: false });
    component['statusControl'].setValue('active');
    component['onApplyColumnFilters']();

    component['onClearFilters']();

    expect(component['searchControl'].value).toBe('');
    expect(component['filterBadge']()).toBeUndefined();
  });

  it('should clear selection when a subsequent lazy-load event targets a different dataset', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component.onLazyLoad({ first: 0, rows: 12 } as TableLazyLoadEvent);
    component['selectedFacilities'].set([MOCK_FACILITY]);

    component.onLazyLoad({ first: 12, rows: 12 } as TableLazyLoadEvent);

    expect(component['selectedFacilities']()).toEqual([]);
  });

  it('should include sort parameters in the load request', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.load.subscribe(spy);

    component.onLazyLoad({
      first: 0,
      rows: 12,
      sortField: 'name',
      sortOrder: 1,
    } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ 'order[name]': 'asc' }) }),
    );
  });

  it('should include the search term in the load request', () => {
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.load.subscribe(spy);
    component['searchControl'].setValue('main site', { emitEvent: false });

    component.onLazyLoad({ first: 0, rows: 12 } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ search: 'main site' }) }),
    );
  });

  it('should reload the first page when the search control changes', () => {
    vi.useFakeTimers();
    const fixture = createComponent({
      facilities: [MOCK_FACILITY],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component.onLazyLoad({ first: 24, rows: 12 } as TableLazyLoadEvent);
    const spy = vi.fn();
    component.load.subscribe(spy);

    component['searchControl'].setValue('main');
    vi.advanceTimersByTime(400);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ search: 'main' }) }),
    );
    vi.useRealTimers();
  });

  it('should disable the search control while loading', () => {
    const fixture = createComponent({ loading: true });
    const component = fixture.componentInstance;

    expect(component['searchControl'].disabled).toBe(true);
  });

  it('should restore the initial page on init', () => {
    TestBed.configureTestingModule({
      imports: [FacilityTable],
      providers: [
        { provide: OrganizationPermissionService, useValue: { hasPermission: vi.fn(() => true) } },
      ],
    });
    const fixture = TestBed.createComponent(FacilityTable);
    fixture.componentRef.setInput('facilities', []);
    fixture.componentRef.setInput('total', 0);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('initialPage', 3);

    fixture.detectChanges();

    expect(fixture.componentInstance['firstPage']()).toBe(24);
  });

  it('should show the create-disabled tooltip and disable creation when the plan limit is reached', () => {
    const fixture = createComponent({ canManage: true });
    fixture.componentRef.setInput('createDisabled', true);
    fixture.componentRef.setInput('createDisabledTooltip', 'Plan limit reached');
    fixture.detectChanges();

    const splitButton = fixture.debugElement.query(By.css('p-splitbutton'));
    expect(splitButton.componentInstance.disabled).toBe(true);
  });
});
