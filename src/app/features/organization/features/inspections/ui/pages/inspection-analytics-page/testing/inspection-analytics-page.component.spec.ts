import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { NonConformityStatisticsOutput } from '@features/organization/features/inspections/models';
import { NonConformityStatisticsStore } from '@features/organization/features/inspections/state';
import { InspectionAnalyticsPage } from '../inspection-analytics-page.component';

const STATISTICS = {
  bySeverity: {
    low: { open: 1, resolved: 2 },
    medium: { open: 2, resolved: 1 },
    high: { open: 3, resolved: 0 },
    critical: { open: 4, resolved: 5 },
  },
  byFacility: [
    { id: 'fa-1', name: 'Main site', open: 6, critical: 3 },
    { id: 'fa-2', open: 2, critical: 0 },
  ],
  byEquipmentType: [{ type: 'extinguisher', open: 5 }],
  resolution: { averageDays: 4.32, medianDays: 3 },
  slaBreachedOpen: 2,
} as unknown as NonConformityStatisticsOutput;

const EMPTY_STATISTICS = {
  bySeverity: {
    low: { open: 0, resolved: 0 },
    medium: { open: 0, resolved: 0 },
    high: { open: 0, resolved: 0 },
    critical: { open: 0, resolved: 0 },
  },
  byFacility: [],
  byEquipmentType: [],
  resolution: {},
  slaBreachedOpen: 0,
} as unknown as NonConformityStatisticsOutput;

describe('InspectionAnalyticsPage', () => {
  let fixture: ComponentFixture<InspectionAnalyticsPage>;
  let service: { getNonConformityStatistics: ReturnType<typeof vi.fn> };

  function element(testId: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
  }

  async function createPage(): Promise<void> {
    fixture = TestBed.createComponent(InspectionAnalyticsPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  }

  beforeEach(() => {
    service = { getNonConformityStatistics: vi.fn().mockReturnValue(of(STATISTICS)) };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        NonConformityStatisticsStore,
        { provide: InspectionService, useValue: service },
      ],
    });
  });

  it('should load the snapshot on init with the default 30-day window', async () => {
    await createPage();

    expect(service.getNonConformityStatistics).toHaveBeenCalledTimes(1);
    const [organizationId, window] = service.getNonConformityStatistics.mock.calls[0] as [
      string,
      { from?: string; to?: string } | undefined,
    ];
    expect(organizationId).toBe('org-1');
    expect(window?.from).toBeDefined();
    expect(window?.to).toBeDefined();
    expect(
      new Date(window?.to ?? '').getTime() - new Date(window?.from ?? '').getTime(),
    ).toBeCloseTo(30 * 24 * 3600 * 1000, -5);
  });

  it('should render the KPI strip from the snapshot', async () => {
    await createPage();

    expect(element('inspection-analytics-kpi-open')?.textContent).toContain('10');
    expect(element('inspection-analytics-kpi-sla')?.textContent).toContain('2');
    expect(element('inspection-analytics-kpi-average')?.textContent).toContain('4.3');
    expect(element('inspection-analytics-kpi-median')?.textContent).toContain('3.0');
  });

  it('should render the severity rows most-urgent first with open and resolved counts', async () => {
    await createPage();

    const rows: NodeListOf<Element> = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[data-testid^="inspection-analytics-severity-"]',
    );
    expect(Array.from(rows).map((row) => row.getAttribute('data-testid'))).toEqual([
      'inspection-analytics-severity-critical',
      'inspection-analytics-severity-high',
      'inspection-analytics-severity-medium',
      'inspection-analytics-severity-low',
    ]);
    expect(rows[0]?.textContent).toContain('4');
    expect(rows[0]?.textContent).toContain('5 resolved');
  });

  it('should render the top facilities and equipment types tables, naming the unnamed', async () => {
    await createPage();

    const facilities: HTMLElement | null = element('inspection-analytics-facilities-table');
    expect(facilities?.textContent).toContain('Main site');
    expect(facilities?.textContent).toContain('Unnamed facility');

    const types: HTMLElement | null = element('inspection-analytics-equipment-types-table');
    expect(types?.textContent).toContain('extinguisher');
  });

  it('should refetch without a window when All time is picked', async () => {
    await createPage();

    const toggle: HTMLButtonElement | null | undefined = element(
      'inspection-analytics-period-toggle',
    )?.querySelector('button[value="all"]');
    toggle?.click();
    await fixture.whenStable();

    expect(service.getNonConformityStatistics).toHaveBeenLastCalledWith('org-1', undefined);
  });

  it('should show em dashes when the window resolved nothing and the empty state on a blank snapshot', async () => {
    service.getNonConformityStatistics.mockReturnValue(of(EMPTY_STATISTICS));
    await createPage();

    expect(element('inspection-analytics-kpi-average')?.textContent).toContain('—');
    expect(element('inspection-analytics-kpi-median')?.textContent).toContain('—');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid^="inspection-analytics-severity-"]',
      ),
    ).toBeNull();
  });

  it('should surface the error state and retry the same query', async () => {
    service.getNonConformityStatistics.mockReturnValueOnce(throwError(() => new Error('boom')));
    await createPage();

    expect(element('inspection-analytics-error')).not.toBeNull();

    const retry: HTMLElement | null = element('inspection-analytics-retry');
    retry?.click();
    await fixture.whenStable();

    expect(service.getNonConformityStatistics).toHaveBeenCalledTimes(2);
    expect(element('inspection-analytics-error')).toBeNull();
    expect(element('inspection-analytics-kpi-open')).not.toBeNull();
  });
});
