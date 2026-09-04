import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LineChart } from '../line-chart.component';

/**
 * Class ChartResizeObserver
 * @class ChartResizeObserver
 * @description Supplies the observer API absent from the DOM test environment.
 * @since 3.0.0
 */
class ChartResizeObserver {
  /**
   * Method observe
   * @method observe
   * @description Provides a no-op observer hook for the DOM test environment.
   * @access public
   * @since 3.0.0
   * @returns {void}
   */
  public observe(): void {}
  /**
   * Method unobserve
   * @method unobserve
   * @description Provides a no-op observer hook for the DOM test environment.
   * @access public
   * @since 3.0.0
   * @returns {void}
   */
  public unobserve(): void {}
  /**
   * Method disconnect
   * @method disconnect
   * @description Provides a no-op observer hook for the DOM test environment.
   * @access public
   * @since 3.0.0
   * @returns {void}
   */
  public disconnect(): void {}
}

describe('LineChart', () => {
  let fixture: ComponentFixture<LineChart>;
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ChartResizeObserver);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  /**
   * Function render
   * @description Mounts representative series on the requested Angular platform.
   * @access private
   * @since 3.0.0
   * @param {string} platform - Angular platform identifier.
   * @returns {Promise<void>}
   */
  async function render(platform = 'browser'): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: platform }],
    });
    fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('series', [
      {
        name: 'Inspections',
        points: [
          { label: 'Jan', value: 3 },
          { label: 'Feb', value: 5 },
        ],
      },
    ]);
    fixture.componentRef.setInput('label', 'Inspections over time');
    await fixture.whenStable();
  }

  it('renders the native Spartan chart with its accessible name', async () => {
    await render();
    expect(fixture.nativeElement.querySelector('tanstack-chart[hlmChart]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Inspections over time',
    );
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });
  it('reserves space while loading', async () => {
    await render();
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tanstack-chart')).toBeNull();
  });
  it('reserves space without mounting an interactive chart on the server', async () => {
    await render('server');
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tanstack-chart')).toBeNull();
  });
  it('reports empty data explicitly', async () => {
    await render();
    fixture.componentRef.setInput('series', []);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[data-slot="empty"]:not([role="alert"])')?.textContent,
    ).toContain('No data');
  });
  it('renders all series labels in its native legend', async () => {
    await render();
    fixture.componentRef.setInput('series', [
      {
        name: 'Opened',
        points: [
          { label: 'Jan', value: 3 },
          { label: 'Feb', value: 5 },
        ],
      },
      { name: 'Resolved', points: [{ label: 'Feb', value: 2 }] },
    ]);
    await fixture.whenStable();
    const chart = fixture.nativeElement.querySelector('tanstack-chart');
    expect(chart.textContent).toContain('Opened');
    expect(chart.textContent).toContain('Resolved');
  });
});
