import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { ChartSeries } from '../../../../models';
import { LineChart } from '../line-chart.component';

/** A canvas drawing method that does nothing — every stubbed context method but the two `stubCanvasContext` gives a real shape. */
function noop(): void {
  return undefined;
}

/**
 * Canvas 2D contexts are not implemented by jsdom (`getContext` returns
 * `null` without the native `canvas` package installed). Chart.js only
 * calls a small, well-known surface of drawing methods and never inspects
 * their return value beyond `measureText`/`createLinearGradient`, so a
 * permissive no-op stub is enough to let a real `Chart` instance construct
 * and render without touching a native canvas backend.
 */
function buildStubContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  let context: CanvasRenderingContext2D;

  const proxy = new Proxy(
    {},
    {
      get: (_target: object, property: string | symbol): unknown => {
        if (property === 'canvas') return canvas;
        if (property === 'getContext')
          return (id: string): CanvasRenderingContext2D | null => (id === '2d' ? context : null);
        if (property === 'measureText') return (): { width: number } => ({ width: 0 });
        if (property === 'createLinearGradient' || property === 'createRadialGradient') {
          return (): { addColorStop: () => void } => ({ addColorStop: noop });
        }

        return noop;
      },
    },
  ) as CanvasRenderingContext2D;

  context = proxy;

  return context;
}

function stubCanvasContext(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement): CanvasRenderingContext2D {
      return buildStubContext(this);
    },
  );
}

/** jsdom has no `ResizeObserver` implementation — Chart.js' responsive layout only needs it to exist, never to actually fire. */
class StubResizeObserver {
  public observe(): void {
    return undefined;
  }
  public unobserve(): void {
    return undefined;
  }
  public disconnect(): void {
    return undefined;
  }
}

/**
 * jsdom reports a zero-size host by default, which Chart.js' responsive
 * layout cannot build a scale from — stub a realistic layout instead.
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
    fixture.nativeElement.remove();
  });

  async function render(
    platform: 'browser' | 'server' = 'browser',
    initialSeries: readonly ChartSeries[] = series(),
    theme: 'light' | 'dark' = 'light',
  ): Promise<void> {
    resolvedTheme = signal<'light' | 'dark'>(theme);

    const themePort: Pick<ThemePort, 'resolvedTheme'> = { resolvedTheme };

    stubChartHostMeasurements();
    stubCanvasContext();
    vi.stubGlobal('ResizeObserver', StubResizeObserver);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        provideCharts(withDefaultRegisterables()),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: THEME_PORT, useValue: themePort },
      ],
    });

    fixture = TestBed.createComponent(LineChart);
    document.body.append(fixture.nativeElement);
    fixture.componentRef.setInput('series', initialSeries);
    fixture.componentRef.setInput('label', 'Inspections over time');
    await fixture.whenStable();
  }

  it('renders the chart with role="img" and the given accessible label', async () => {
    await render();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');

    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-label')).toBe('Inspections over time');
  });

  it('mounts a canvas element for the chart', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('canvas[baseChart]')).not.toBeNull();
  });

  it('shows a skeleton instead of the chart while loading', async () => {
    await render();
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('div[role="img"]')).toBeNull();
  });

  it('shows a skeleton instead of mounting the canvas on the server platform', async () => {
    await render('server');

    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('canvas[baseChart]')).toBeNull();
  });

  it('shows the empty state when no series carries a point', async () => {
    await render();
    fixture.componentRef.setInput('series', [{ name: 'Inspections', points: [] }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('div[role="img"]')).toBeNull();
  });

  it('treats a series list with at least one point as non-empty', async () => {
    await render('browser', [
      { name: 'Empty', points: [] },
      { name: 'Has data', points: [{ label: 'Jan', value: 1 }] },
    ]);

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('div[role="img"]')).not.toBeNull();
  });

  it('sizes the host to the given height, with no extra reserve for the legend', async () => {
    await render();
    fixture.componentRef.setInput('height', 240);
    await fixture.whenStable();

    const wrapper: HTMLElement | null = fixture.nativeElement.querySelector('div[role="img"]');

    expect(wrapper?.style.height).toBe('240px');
  });

  it('mounts the chart the same way under the dark appearance', async () => {
    await render('browser', series(), 'dark');

    expect(fixture.nativeElement.querySelector('canvas[baseChart]')).not.toBeNull();
  });
});
