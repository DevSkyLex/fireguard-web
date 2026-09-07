import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DonutChart } from '../donut-chart.component';

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

describe('DonutChart', () => {
  let fixture: ComponentFixture<DonutChart>;
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ChartResizeObserver);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  /**
   * Function render
   * @description Mounts named status slices on the chosen platform.
   * @access private
   * @since 1.0.0
   * @param {string} platform - Browser or server.
   * @returns {Promise<void>}
   */
  async function render(platform = 'browser'): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: platform }],
    });
    fixture = TestBed.createComponent(DonutChart);
    fixture.componentRef.setInput('segments', [
      { id: 'open', label: 'Open', value: 5, colorToken: 'warning' },
      { id: 'done', label: 'Done', value: 12, colorToken: 'success' },
    ]);
    fixture.componentRef.setInput('label', 'Non-conformities by status');
    await fixture.whenStable();
  }
  it('renders a native accessible SVG and derives its total from the slices', async () => {
    await render();
    expect(fixture.nativeElement.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Non-conformities by status',
    );
    expect(fixture.nativeElement.textContent).toContain('17');
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });
  it('excludes invalid and negative slices without corrupting the total', async () => {
    await render();
    fixture.componentRef.setInput('segments', [
      { id: 'valid', label: 'Valid', value: 3, colorToken: 'primary' },
      { id: 'invalid', label: 'Invalid', value: NaN, colorToken: 'warning' },
      { id: 'negative', label: 'Negative', value: -2, colorToken: 'warning' },
    ]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('3');
    expect(fixture.nativeElement.textContent).not.toContain('NaN');
  });
  it('distinguishes a real zero total from an interactive donut', async () => {
    await render();
    fixture.componentRef.setInput('segments', [
      { id: 'open', label: 'Open', value: 0, colorToken: 'warning' },
    ]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tanstack-chart')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No data to display');
  });
  it('reserves chart space on the server and during loading', async () => {
    await render('server');
    expect(fixture.nativeElement.querySelector('hlm-skeleton').style.height).toBe('240px');
    expect(fixture.nativeElement.querySelector('tanstack-chart')).toBeNull();
  });
  it('replaces the SVG with a height-matched skeleton while loading', async () => {
    await render();
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tanstack-chart')).toBeNull();
  });
});
