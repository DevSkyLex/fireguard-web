import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';
import { OverviewChart } from '../overview-chart.component';

const mockAligned = { labels: ['Apr 1'], datasets: [[1], [1], [1]] };

const mockStore = {
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  queryData: signal(null),
  alignedTrendData: signal(mockAligned),
};

const mockThemePort: ThemePort = {
  theme: signal<ThemeMode>('light'),
  resolvedTheme: signal<'light' | 'dark'>('light'),
  setTheme: vi.fn(),
};

describe('OverviewChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverviewChart],
      providers: [
        { provide: OrganizationDashboardOverviewTrendStore, useValue: mockStore },
        { provide: THEME_PORT, useValue: mockThemePort },
      ],
    });
  });

  function createComponent(loading = false) {
    mockStore.isQueryLoading.set(loading);
    mockStore.queryData.set(null);
    const fixture = TestBed.createComponent(OverviewChart);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeleton when loading and no data', () => {
    const fixture = createComponent(true);
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('should show chart when not loading', () => {
    const fixture = createComponent(false);
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
  });
});
