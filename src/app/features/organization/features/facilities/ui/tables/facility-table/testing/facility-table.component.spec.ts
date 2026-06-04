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

  it('should show skeleton placeholders while loading', () => {
    const fixture = createComponent({ loading: true });
    const skeleton = fixture.debugElement.query(By.css('.p-skeleton'));
    expect(skeleton).toBeTruthy();
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
});
