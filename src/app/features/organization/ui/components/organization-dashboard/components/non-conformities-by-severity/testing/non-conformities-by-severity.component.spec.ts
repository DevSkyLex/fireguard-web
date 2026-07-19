import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { NonConformitySeverityBucket } from '@features/organization/data-access/adapters/organization-dashboard-severity.adapter';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { NonConformitiesBySeverity } from '../non-conformities-by-severity.component';

const bars = (fixture: ComponentFixture<NonConformitiesBySeverity>): HTMLElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('[role="meter"] > div'));

describe('NonConformitiesBySeverity', () => {
  const createComponent = (buckets: readonly NonConformitySeverityBucket[], loading = false) => {
    const bucketsSignal: WritableSignal<readonly NonConformitySeverityBucket[]> = signal(buckets);

    TestBed.configureTestingModule({
      imports: [NonConformitiesBySeverity],
      providers: [
        {
          provide: DashboardStore,
          useValue: {
            nonConformitiesBySeverity: bucketsSignal,
            isQueryLoading: signal(loading),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(NonConformitiesBySeverity);
    fixture.detectChanges();
    return fixture;
  };

  const full: readonly NonConformitySeverityBucket[] = [
    { severity: 'critical', count: 3 },
    { severity: 'high', count: 2 },
    { severity: 'medium', count: 4 },
    { severity: 'low', count: 1 },
  ];

  it('should render one row per bucket', () => {
    expect(bars(createComponent(full))).toHaveLength(4);
  });

  // The bars compare severities against each other. Scaling to the total (10
  // here) would render the largest bucket at 40% and the smallest at 10% — a
  // strip of near-invisible slivers.
  it('should scale bars against the largest bucket, not the total', () => {
    const widths = bars(createComponent(full)).map((bar) => bar.style.width);

    expect(widths[2]).toBe('100%');
    expect(widths[0]).toBe('75%');
    expect(widths[3]).toBe('25%');
  });

  it('should sum every bucket into the open total', () => {
    expect(createComponent(full).nativeElement.textContent).toContain('10');
  });

  // Math.max() of an empty list is -Infinity; without the seeded 0 every width
  // would come out NaN.
  it('should render zero-width bars rather than NaN when everything is zero', () => {
    const widths = bars(
      createComponent([
        { severity: 'critical', count: 0 },
        { severity: 'high', count: 0 },
        { severity: 'medium', count: 0 },
        { severity: 'low', count: 0 },
      ]),
    ).map((bar) => bar.style.width);

    expect(widths).toEqual(['0%', '0%', '0%', '0%']);
  });

  // PRODUCT.md: status is never colour-only. The severity name must be
  // readable next to its bar.
  it('should name each severity next to its bar', () => {
    const text: string = createComponent(full).nativeElement.textContent ?? '';

    expect(text).toContain('Critical');
    expect(text).toContain('High');
    expect(text).toContain('Medium');
    expect(text).toContain('Low');
  });

  it('should expose each bar as a meter bounded by the open total', () => {
    const meter: HTMLElement = createComponent(full).nativeElement.querySelector('[role="meter"]');

    expect(meter.getAttribute('aria-valuenow')).toBe('3');
    expect(meter.getAttribute('aria-valuemax')).toBe('10');
  });
});
