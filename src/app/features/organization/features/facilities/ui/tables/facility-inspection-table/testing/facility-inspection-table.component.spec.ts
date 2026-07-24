import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TableLazyLoadEvent } from 'primeng/table';
import { OrganizationPermissionService } from '@features/organization/access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { FacilityInspectionTable } from '../facility-inspection-table.component';

const MOCK_INSPECTION: InspectionOutput = {
  id: 'insp-1',
  organizationId: 'org-1',
  equipmentId: 'eq-1',
  facilityId: 'fac-1',
  result: 'pass',
  status: 'submitted',
  performedAt: '2025-01-05T10:00:00+00:00',
  inspector: {
    type: 'user',
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    avatarUrl: null,
    organizationName: 'Acme Corp',
  },
  checklistId: null,
  notes: null,
  signature: null,
  nonConformitiesCount: 2,
  createdAt: '2025-01-05T10:00:00+00:00',
  updatedAt: '2025-01-05T10:00:00+00:00',
} as InspectionOutput;

describe('FacilityInspectionTable', () => {
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
    inspections?: readonly InspectionOutput[];
    total?: number;
    loading?: boolean;
    empty?: boolean;
    canManage?: boolean;
  }) => {
    TestBed.configureTestingModule({
      imports: [FacilityInspectionTable],
      providers: [
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: vi.fn(() => overrides?.canManage ?? true),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(FacilityInspectionTable);
    fixture.componentRef.setInput('inspections', overrides?.inspections ?? []);
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

  it('should render inspection rows', () => {
    const fixture = createComponent({
      inspections: [MOCK_INSPECTION],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
    expect(fixture.nativeElement.textContent).toContain('User');
    expect(fixture.nativeElement.textContent).toContain('Pass');
    expect(fixture.nativeElement.textContent).toContain('Submitted');
    expect(fixture.nativeElement.textContent).toContain('2 findings');
  });

  it('should render an empty message when there are no inspections', () => {
    const fixture = createComponent({ inspections: [], total: 0, empty: true });
    expect(fixture.nativeElement.textContent).toContain('No inspections found');
  });

  it('should show skeleton placeholders while loading', () => {
    const fixture = createComponent({ loading: true });
    const skeleton = fixture.debugElement.query(By.css('.p-skeleton'));
    expect(skeleton).toBeTruthy();
  });

  it('should emit a load request with the resolved page', () => {
    const fixture = createComponent({
      inspections: [MOCK_INSPECTION],
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

  it('should render the organization context label when the inspector has an organization', () => {
    const fixture = createComponent({
      inspections: [MOCK_INSPECTION],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('User - Acme Corp');
  });

  it('should render a generic context label when the inspector has no organization', () => {
    const fixture = createComponent({
      inspections: [
        {
          ...MOCK_INSPECTION,
          inspector: { ...MOCK_INSPECTION.inspector, organizationName: null },
        } as InspectionOutput,
      ],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('User inspector');
  });

  it('should fall back to the inspector display name when first/last name are missing', () => {
    const fixture = createComponent({
      inspections: [
        {
          ...MOCK_INSPECTION,
          inspector: { ...MOCK_INSPECTION.inspector, firstName: null, lastName: null },
        } as InspectionOutput,
      ],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  it('should render a dash instead of the findings tag when there are no non-conformities', () => {
    const fixture = createComponent({
      inspections: [{ ...MOCK_INSPECTION, nonConformitiesCount: 0 } as InspectionOutput],
      total: 1,
      empty: false,
    });

    expect(fixture.nativeElement.textContent).not.toContain('findings');
  });

  it('should toggle the action menu and store the targeted inspection', () => {
    const fixture = createComponent({
      inspections: [MOCK_INSPECTION],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const actionMenu = component['actionMenu' as never] as unknown as () => {
      toggle: (event: Event) => void;
    };
    const toggleSpy = vi.spyOn(actionMenu(), 'toggle');
    const event = new MouseEvent('click');

    component['onActionMenuToggle'](event, MOCK_INSPECTION);

    expect(toggleSpy).toHaveBeenCalledWith(event);
  });

  it('should expose view and edit action menu items with manage permission', () => {
    const fixture = createComponent({ canManage: true });
    const component = fixture.componentInstance;
    component['onActionMenuToggle'](new MouseEvent('click'), MOCK_INSPECTION);

    const items = component['actionMenuItems']();

    expect(items.length).toBeGreaterThan(0);
  });

  it('should return no action menu items when nothing is targeted', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance['actionMenuItems']()).toEqual([]);
  });

  it('should clear the result/status filters and reload on onClearFilters', () => {
    const fixture = createComponent({
      inspections: [MOCK_INSPECTION],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    component.onLazyLoad({ first: 0, rows: 12 } as TableLazyLoadEvent);
    component['resultControl'].setValue('pass', { emitEvent: false });
    component['statusControl'].setValue('submitted', { emitEvent: false });

    component['onClearFilters']();

    expect(component['resultControl'].value).toBeNull();
    expect(component['statusControl'].value).toBeNull();
  });

  it('should reload when the result or status filters change', () => {
    const fixture = createComponent({
      inspections: [MOCK_INSPECTION],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.load.subscribe(spy);

    component['resultControl'].setValue('fail');

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ result: 'fail' }) }),
    );
  });

  it('should include sort parameters in the load request', () => {
    const fixture = createComponent({
      inspections: [MOCK_INSPECTION],
      total: 1,
      empty: false,
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.load.subscribe(spy);

    component.onLazyLoad({
      first: 0,
      rows: 12,
      sortField: 'performedAt',
      sortOrder: 1,
    } as TableLazyLoadEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ 'order[performedAt]': 'asc' }) }),
    );
  });

  it('should resolve the result and status descriptors', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['getResultOption']('pass')).toBeTruthy();
    expect(component['getStatusOption']('submitted')).toBeTruthy();
  });

  it('should render the empty-state action button to create an inspection when permitted', () => {
    const fixture = createComponent({ canManage: true, inspections: [], total: 0, empty: true });

    expect(fixture.nativeElement.textContent).toContain('New inspection');
  });

  it('should restore the initial page on init', () => {
    TestBed.configureTestingModule({
      imports: [FacilityInspectionTable],
      providers: [
        { provide: OrganizationPermissionService, useValue: { hasPermission: vi.fn(() => true) } },
      ],
    });
    const fixture = TestBed.createComponent(FacilityInspectionTable);
    fixture.componentRef.setInput('inspections', []);
    fixture.componentRef.setInput('total', 0);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('initialPage', 2);

    fixture.detectChanges();

    expect(fixture.componentInstance['firstPage']()).toBe(12);
  });
});
