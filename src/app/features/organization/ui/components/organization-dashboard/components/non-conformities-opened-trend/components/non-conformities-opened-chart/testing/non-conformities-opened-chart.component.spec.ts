import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import { NonConformitiesOpenedChart } from '../non-conformities-opened-chart.component';

const mockStore = {
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  queryData: signal({ series: [{ bucket: '2026-04-01', value: 1 }] }),
  compareEnabled: signal(false),
};

const mockThemePort: ThemePort = {
  theme: signal<ThemeMode>('light'),
  resolvedTheme: signal<'light' | 'dark'>('light'),
  setTheme: vi.fn(),
};

describe('NonConformitiesOpenedChart', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NonConformitiesOpenedChart],
      providers: [
        { provide: OrganizationDashboardNonConformitiesOpenedStore, useValue: mockStore },
        { provide: THEME_PORT, useValue: mockThemePort },
      ],
    });
  });

  function createComponent(loading = false) {
    mockStore.isQueryLoading.set(loading);
    const fixture = TestBed.createComponent(NonConformitiesOpenedChart);
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
