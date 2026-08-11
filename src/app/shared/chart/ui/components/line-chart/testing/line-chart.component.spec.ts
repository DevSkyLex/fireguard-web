import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { ChartSeries } from '../../../../models';
import { LineChart } from '../line-chart.component';

/**
 * A series whose points carry `Date` labels rather than the string labels
 * {@link series} otherwise uses — the continuous-scale case where the
 * component enables ngx-charts' `roundDomains`.
 */
function dateLabeledSeries(): readonly ChartSeries[] {
  return [
    {
      name: 'Inspections',
      points: [
        { label: new Date('2026-01-01'), value: 3 },
        { label: new Date('2026-02-01'), value: 5 },
      ],
    },
  ];
}

/**
 * jsdom reports a zero-size host by default, which ngx-charts' area
 * renderer cannot build a d3 scale from — stub a realistic layout instead.
 */
function stubChartHostMeasurements(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 320,
    top: 0,
    left: 0,
    bottom: 320,
    right: 600,
    x: 0,
    y: 0,
    toJSON: (): void => undefined,
  } as DOMRect);
}

function series(): readonly ChartSeries[] {
  return [
    {
      name: 'Inspections',
      points: [
        { label: 'Jan', value: 3 },
        { label: 'Feb', value: 5 },
      ],
    },
  ];
}

describe('LineChart', () => {
  let fixture: ComponentFixture<LineChart>;
  let resolvedTheme: ReturnType<typeof signal<'light' | 'dark'>>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function render(platform: 'browser' | 'server' = 'browser'): Promise<void> {
    resolvedTheme = signal<'light' | 'dark'>('light');

    const themePort: Pick<ThemePort, 'resolvedTheme'> = { resolvedTheme };

    stubChartHostMeasurements();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: THEME_PORT, useValue: themePort },
      ],
    });

    fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('series', series());
    fixture.componentRef.setInput('label', 'Inspections over time');
    await fixture.whenStable();
  }

  it('renders the chart with role="img" and the given accessible label', async () => {
    await render();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');

    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-label')).toBe('Inspections over time');
  });

  it('renders a line chart, not an area chart, by default', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('ngx-charts-line-chart')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ngx-charts-area-chart')).toBeNull();
  });

  it('renders an area chart when area is set', async () => {
    await render();
    fixture.componentRef.setInput('area', true);
    fixture.componentRef.setInput('series', dateLabeledSeries());
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ngx-charts-area-chart')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ngx-charts-line-chart')).toBeNull();
  });

  it('renders an area chart from string-labeled points without throwing', async () => {
    await render();
    fixture.componentRef.setInput('area', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ngx-charts-area-chart')).not.toBeNull();
  });

  it('shows a skeleton instead of the chart while loading', async () => {
    await render();
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('div[role="img"]')).toBeNull();
  });

  it('shows a skeleton instead of mounting ngx-charts on the server platform', async () => {
    await render('server');

    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ngx-charts-line-chart')).toBeNull();
  });

  it('shows the empty state when no series carries a point', async () => {
    await render();
    fixture.componentRef.setInput('series', [{ name: 'Inspections', points: [] }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('div[role="img"]')).toBeNull();
  });

  it('treats a series list with at least one point as non-empty', async () => {
    await render();
    fixture.componentRef.setInput('series', [
      { name: 'Empty', points: [] },
      { name: 'Has data', points: [{ label: 'Jan', value: 1 }] },
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('div[role="img"]')).not.toBeNull();
  });

  it('reserves extra host height for the below-plot legend, on top of the given chart height', async () => {
    await render();
    fixture.componentRef.setInput('height', 240);
    await fixture.whenStable();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');
    const chartHost: HTMLElement | null = fixture.nativeElement.querySelector(
      'ngx-charts-line-chart',
    )?.parentElement as HTMLElement | null;

    expect(wrapper?.style.height).toBe('300px');
    expect(chartHost?.style.height).toBe('240px');
  });

  it('does not reserve legend height when the legend is hidden', async () => {
    await render();
    fixture.componentRef.setInput('height', 240);
    fixture.componentRef.setInput('showLegend', false);
    await fixture.whenStable();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');

    expect(wrapper?.style.height).toBe('240px');
  });
});
