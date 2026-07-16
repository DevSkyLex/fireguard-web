import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { OrganizationDashboardInspectionsTrendStore } from '@features/organization/state/organization-dashboard';
import { InspectionsChart } from '../inspections-chart.component';

const mockStore = {
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  queryData: signal({ series: [{ bucket: '2026-04-01', value: 1 }] }),
  compareEnabled: signal(false),
  selectedInspectionResult: signal(null),
  selectedInspectionStatus: signal(null),
};

const mockThemePort: ThemePort = {
  theme: signal<ThemeMode>('light'),
  resolvedTheme: signal<'light' | 'dark'>('light'),
  setTheme: vi.fn(),
};

describe('InspectionsChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectionsChart],
      providers: [
        { provide: OrganizationDashboardInspectionsTrendStore, useValue: mockStore },
        { provide: THEME_PORT, useValue: mockThemePort },
      ],
    });
  });

  function createComponent(loading = false) {
    mockStore.isQueryLoading.set(loading);
    const fixture = TestBed.createComponent(InspectionsChart);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a skeleton while loading', () => {
    const fixture = createComponent(true);
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('should render the chart when not in initial loading state', () => {
    mockStore.isQueryLoading.set(false);
    const fixture = TestBed.createComponent(InspectionsChart);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-chart')).not.toBeNull();
  });
});
