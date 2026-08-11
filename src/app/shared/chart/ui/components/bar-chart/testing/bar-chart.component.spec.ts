import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { ChartSeries } from '../../../../models';
import { BarChart } from '../bar-chart.component';

/**
 * jsdom reports a zero-size host by default, which ngx-charts' scale
 * construction cannot work with — stub a realistic layout instead.
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

function series(count: 1 | 2 = 1): readonly ChartSeries[] {
  const base: ChartSeries = {
    name: 'Opened',
    points: [
      { label: 'Jan', value: 3 },
      { label: 'Feb', value: 5 },
    ],
  };

  if (count === 1) return [base];

  return [base, { name: 'Resolved', points: [{ label: 'Jan', value: 2 }] }];
}

describe('BarChart', () => {
  let fixture: ComponentFixture<BarChart>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function render(platform: 'browser' | 'server' = 'browser'): Promise<void> {
    const themePort: Pick<ThemePort, 'resolvedTheme'> = {
      resolvedTheme: signal<'light' | 'dark'>('light'),
    };

    stubChartHostMeasurements();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: THEME_PORT, useValue: themePort },
      ],
    });

    fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('series', series());
    fixture.componentRef.setInput('label', 'Non-conformities by status');
    await fixture.whenStable();
  }

  it('renders the chart with role="img" and the given accessible label', async () => {
    await render();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');

    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-label')).toBe('Non-conformities by status');
  });

  it('renders plain bars for one series', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('ngx-charts-bar-vertical')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ngx-charts-bar-vertical-2d')).toBeNull();
  });

  it('renders grouped bars once a second series is given', async () => {
    await render();
    fixture.componentRef.setInput('series', series(2));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ngx-charts-bar-vertical-2d')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ngx-charts-bar-vertical')).toBeNull();
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
    expect(fixture.nativeElement.querySelector('ngx-charts-bar-vertical')).toBeNull();
  });

  it('shows the empty state when no series carries a point', async () => {
    await render();
    fixture.componentRef.setInput('series', [{ name: 'Opened', points: [] }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('div[role="img"]')).toBeNull();
  });

  it('reserves extra host height for the below-plot legend, on top of the given chart height', async () => {
    await render();
    fixture.componentRef.setInput('height', 200);
    await fixture.whenStable();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');
    const chartHost: HTMLElement | null = fixture.nativeElement.querySelector(
      'ngx-charts-bar-vertical',
    )?.parentElement as HTMLElement | null;

    expect(wrapper?.style.height).toBe('260px');
    expect(chartHost?.style.height).toBe('200px');
  });

  it('does not reserve legend height when the legend is hidden', async () => {
    await render();
    fixture.componentRef.setInput('height', 200);
    fixture.componentRef.setInput('showLegend', false);
    await fixture.whenStable();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');

    expect(wrapper?.style.height).toBe('200px');
  });
});
