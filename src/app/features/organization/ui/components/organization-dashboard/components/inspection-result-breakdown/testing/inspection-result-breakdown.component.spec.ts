import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT } from '@core/theme';
import type { InspectionResultBucket } from '@features/organization/data-access/adapters/organization-dashboard-inspection-result.adapter';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { InspectionResultBreakdown } from '../inspection-result-breakdown.component';

const legendRows = (fixture: ComponentFixture<InspectionResultBreakdown>): HTMLElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('li'));

describe('InspectionResultBreakdown', () => {
  const createComponent = (buckets: readonly InspectionResultBucket[]) => {
    const bucketsSignal: WritableSignal<readonly InspectionResultBucket[]> = signal(buckets);

    TestBed.configureTestingModule({
      imports: [InspectionResultBreakdown],
      providers: [
        {
          provide: DashboardStore,
          useValue: { inspectionsByResult: bucketsSignal, isQueryLoading: signal(false) },
        },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
      ],
    });

    const fixture = TestBed.createComponent(InspectionResultBreakdown);
    fixture.detectChanges();
    return fixture;
  };

  const graded: readonly InspectionResultBucket[] = [
    { result: 'pass', count: 30 },
    { result: 'partial', count: 12 },
    { result: 'fail', count: 8 },
  ];

  it('should render one legend row per outcome', () => {
    expect(legendRows(createComponent(graded))).toHaveLength(3);
  });

  // The canvas is aria-hidden, so the legend is the only accessible carrier of
  // both the outcome names and their counts.
  it('should name every outcome in the legend', () => {
    const text: string = createComponent(graded).nativeElement.textContent ?? '';

    expect(text).toContain('Pass');
    expect(text).toContain('Partial');
    expect(text).toContain('Fail');
  });

  // The centre counts graded inspections, not every inspection: a draft has no
  // outcome yet, so counting it would leave part of the ring unaccounted for.
  it('should show the graded total at the centre', () => {
    expect(createComponent(graded).nativeElement.textContent).toContain('50');
  });

  // Chart.js draws no arc for an all-zero dataset, leaving a blank square where
  // the doughnut should be.
  it('should show an empty message instead of a blank doughnut when nothing is graded', () => {
    const fixture = createComponent([
      { result: 'pass', count: 0 },
      { result: 'partial', count: 0 },
      { result: 'fail', count: 0 },
    ]);

    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No inspection has been graded yet.');
  });

  it('should render the doughnut once something is graded', () => {
    expect(createComponent(graded).nativeElement.querySelector('p-chart')).not.toBeNull();
  });

  // An outcome the registry does not know must still be counted and labelled
  // rather than dropped.
  it('should fall back to the raw value for an outcome outside the registry', () => {
    const fixture = createComponent([{ result: 'inconclusive', count: 7 }]);

    expect(fixture.nativeElement.textContent).toContain('inconclusive');
    expect(fixture.nativeElement.textContent).toContain('7');
  });
});
