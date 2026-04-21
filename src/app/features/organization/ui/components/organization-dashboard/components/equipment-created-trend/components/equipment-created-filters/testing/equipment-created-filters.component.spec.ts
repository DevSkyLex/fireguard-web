import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardEquipmentCreatedStore } from '@features/organization/state/organization-dashboard';
import { EquipmentCreatedFilters } from '../equipment-created-filters.component';

const mockStore = {
  selectedEquipmentType: signal(null),
  selectedEquipmentStatus: signal(null),
  selectedDateRange: signal(null),
  compareEnabled: signal(false),
  draftEquipmentType: signal(null),
  draftEquipmentStatus: signal(null),
  draftDateRange: signal(null),
  draftCompareEnabled: signal(false),
  isQueryLoading: signal(false),
  setEquipmentType: vi.fn(),
  setEquipmentStatus: vi.fn(),
  setDateRange: vi.fn(),
  setCompareEnabled: vi.fn(),
  setDraftEquipmentType: vi.fn(),
  setDraftEquipmentStatus: vi.fn(),
  setDraftDateRange: vi.fn(),
  setDraftCompareEnabled: vi.fn(),
};

describe('EquipmentCreatedFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EquipmentCreatedFilters],
      providers: [
        { provide: OrganizationDashboardEquipmentCreatedStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(EquipmentCreatedFilters);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render two selects and the compare toggle', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelectorAll('p-select')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('p-togglebutton')).not.toBeNull();
  });

  it('should resolve selectedEquipmentStatusOption as null when no status selected', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.selectedEquipmentStatusOption()).toBeNull();
  });
});
