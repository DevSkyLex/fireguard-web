import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FacilityKpiStrip, type FacilityKpi } from '../facility-kpi-strip.component';

const createComponent = (
  kpis: readonly FacilityKpi[],
  loading = false,
): ComponentFixture<FacilityKpiStrip> => {
  TestBed.configureTestingModule({ imports: [FacilityKpiStrip] });

  const fixture = TestBed.createComponent(FacilityKpiStrip);
  fixture.componentRef.setInput('kpis', kpis);
  fixture.componentRef.setInput('loading', loading);
  fixture.detectChanges();
  return fixture;
};

const cells = (fixture: ComponentFixture<FacilityKpiStrip>): HTMLElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('[data-testid="facility-kpi-cell"]'));

describe('FacilityKpiStrip', () => {
  const KPIS: readonly FacilityKpi[] = [
    { label: 'Compliance', value: '75%' },
    { label: 'Equipment', value: '41', sub: '3 to monitor' },
    { label: 'Overdue inspections', value: '1', sub: 'needs attention' },
    { label: 'Next inspection', value: '56 d' },
  ];

  it('should render one cell per figure', () => {
    expect(cells(createComponent(KPIS))).toHaveLength(4);
  });

  it('should render the label, the value and the qualifier', () => {
    const text: string = cells(createComponent(KPIS))[1]?.textContent ?? '';

    expect(text).toContain('Equipment');
    expect(text).toContain('41');
    expect(text).toContain('3 to monitor');
  });

  // A missing qualifier must not leave an empty line reserving space — the
  // cells sit side by side and would stop lining up.
  it('should render nothing where a figure has no qualifier', () => {
    const fixture = createComponent(KPIS);

    expect(cells(fixture)[0]?.children).toHaveLength(2);
    expect(cells(fixture)[1]?.children).toHaveLength(3);
  });

  // The strip sits directly under the header; collapsing it while the figures
  // load would shove the whole workspace down a beat later.
  it('should hold its height with skeletons while loading', () => {
    const fixture = createComponent([], true);

    expect(cells(fixture)).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
  });

  it('should render nothing but the shell for an empty set', () => {
    const fixture = createComponent([]);

    expect(cells(fixture)).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-kpi-strip"]'),
    ).not.toBeNull();
  });
});
