import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';
import { OverviewFilters } from '../overview-filters.component';

const mockAligned = { labels: [], datasets: [[], [], []] };

const mockStore = {
  selectedDateRange: signal(null),
  compareEnabled: signal(false),
  draftDateRange: signal(null),
  draftCompareEnabled: signal(false),
  isQueryLoading: signal(false),
  alignedTrendData: signal(mockAligned),
  setDateRange: vi.fn(),
  setCompareEnabled: vi.fn(),
  setDraftDateRange: vi.fn(),
  setDraftCompareEnabled: vi.fn(),
};

describe('OverviewFilters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverviewFilters],
      providers: [
        { provide: OrganizationDashboardOverviewTrendStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(OverviewFilters);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render only the compare toggle (no selects)', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelectorAll('p-select')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('p-togglebutton')).not.toBeNull();
  });
});
