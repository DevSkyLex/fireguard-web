import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MetricCard } from '../metric-card.component';

describe('MetricCard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MetricCard] });
  });

  const create = (inputs: Record<string, unknown> = {}) => {
    const fixture = TestBed.createComponent(MetricCard);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  };

  const deltaClasses = (fixture: ReturnType<typeof create>): string =>
    fixture.debugElement.query(By.css('[data-testid="metric-card-delta"]')).nativeElement.className;

  it('should render the label, value and supporting description', () => {
    const fixture = create({
      title: 'Open non-conformities',
      value: 12,
      description: '3 critical',
    });

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Open non-conformities');
    expect(text).toContain('12');
    expect(text).toContain('3 critical');
  });

  // A metric that could not be measured is not a metric that is zero.
  it('should render an em dash for a null value', () => {
    const fixture = create({ value: null });

    expect(
      fixture.debugElement.query(By.css('[data-testid="metric-card-value"]')).nativeElement
        .textContent,
    ).toContain('—');
  });

  it('should show skeletons instead of the value while loading', () => {
    const fixture = create({ value: 12, loading: true });

    expect(fixture.debugElement.query(By.css('[data-testid="metric-card-value"]'))).toBeNull();
    expect(fixture.debugElement.queryAll(By.css('p-skeleton')).length).toBeGreaterThan(0);
  });

  it('should paint a rise green when higher is better', () => {
    const fixture = create({
      polarity: 'higher',
      comparison: { value: '+3', direction: 'up' },
    });

    expect(deltaClasses(fixture)).toContain('text-green-700');
  });

  // The whole reason polarity exists: on a count you want to shrink, a fall is
  // an improvement — painting it red would report progress as a regression.
  it('should paint a fall green when lower is better', () => {
    const fixture = create({
      polarity: 'lower',
      comparison: { value: '−4', direction: 'down' },
    });

    expect(deltaClasses(fixture)).toContain('text-green-700');
  });

  it('should paint a rise red when lower is better', () => {
    const fixture = create({
      polarity: 'lower',
      comparison: { value: '+4', direction: 'up' },
    });

    expect(deltaClasses(fixture)).toContain('text-red-700');
  });

  it('should leave the delta muted for a neutral metric and for a flat change', () => {
    expect(
      deltaClasses(create({ polarity: 'neutral', comparison: { value: '+3', direction: 'up' } })),
    ).toContain('text-surface-600');

    expect(
      deltaClasses(create({ polarity: 'higher', comparison: { value: '0', direction: null } })),
    ).toContain('text-surface-600');
  });

  it('should render the comparison label when provided', () => {
    const fixture = create({
      comparison: { value: '+3', direction: 'up' },
      comparisonLabel: 'vs last week',
    });

    expect(fixture.nativeElement.textContent).toContain('vs last week');
  });

  it('should draw a sparkline only with at least two points', () => {
    expect(create({ points: [1] }).debugElement.query(By.css('svg'))).toBeNull();
    expect(create({ points: [1, 4, 2] }).debugElement.query(By.css('svg'))).toBeTruthy();
  });
});
