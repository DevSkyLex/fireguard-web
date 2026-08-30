import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CollectionSurface } from '../collection-surface.component';

@Component({
  selector: 'app-host',
  imports: [CollectionSurface],
  template: `
    <app-collection-surface
      caption="The organization's widgets."
      testId="widget-table"
      [loading]="loading()"
      [hasError]="hasError()"
      [rowCount]="rowCount()"
      [columnCount]="2"
      [skeletonColumns]="['w-14', 'w-56']"
    >
      <tr surfaceHead>
        <th>Name</th>
        <th>Status</th>
      </tr>
      <tr surfaceRows data-testid="widget-row">
        <td>Widget one</td>
      </tr>
      <div surfaceCards data-testid="widget-card">Widget one card</div>
      <div surfaceEmpty data-testid="widget-empty">No widgets</div>
      <div surfaceError data-testid="widget-error">Widgets could not load</div>
    </app-collection-surface>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  public readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  public readonly hasError: WritableSignal<boolean> = signal<boolean>(false);
  public readonly rowCount: WritableSignal<number> = signal<number>(1);
}

describe('CollectionSurface', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('renders the projected rows and no skeleton once data has loaded', () => {
    expect(byTestId('widget-row')).not.toBeNull();
    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
    expect(root().querySelector('[role="status"]')).toBeNull();
  });

  it('draws the skeleton instead of the projected rows on the first load', async () => {
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.rowCount.set(0);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(byTestId('widget-row')).toBeNull();
  });

  it('keeps the real rows visible when a subsequent page is loading (first load only)', async () => {
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.rowCount.set(1);
    await fixture.whenStable();

    expect(byTestId('widget-row')).not.toBeNull();
    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('announces the first load with a non-hidden role=status region', async () => {
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.rowCount.set(0);
    await fixture.whenStable();

    const status: HTMLElement | null = root().querySelector('[role="status"]');

    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-hidden')).toBeNull();
    expect(status?.textContent).toContain('Loading');
  });

  it('gives the scroll container region/tabindex/labelledby wiring to the caption', () => {
    const region: HTMLElement | null = root().querySelector('[role="region"]');

    expect(region).not.toBeNull();
    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('tabindex')).toBe('0');

    const labelledBy: string | null = region?.getAttribute('aria-labelledby') ?? null;
    expect(labelledBy).not.toBeNull();
    expect(root().querySelector(`#${labelledBy}`)?.tagName.toLowerCase()).toBe('caption');
  });

  it('renders the error slot instead of the table when hasError is set', async () => {
    fixture.componentInstance.hasError.set(true);
    await fixture.whenStable();

    expect(byTestId('widget-error')).not.toBeNull();
    expect(byTestId('widget-row')).toBeNull();
  });

  it('renders the empty slot instead of the table when there are no rows', async () => {
    fixture.componentInstance.rowCount.set(0);
    await fixture.whenStable();

    expect(byTestId('widget-empty')).not.toBeNull();
    expect(byTestId('widget-row')).toBeNull();
  });

  it('prioritizes the error slot over the empty slot', async () => {
    fixture.componentInstance.rowCount.set(0);
    fixture.componentInstance.hasError.set(true);
    await fixture.whenStable();

    expect(byTestId('widget-error')).not.toBeNull();
    expect(byTestId('widget-empty')).toBeNull();
  });

  it('renders the card slot below the container breakpoint, hidden at and above it', () => {
    expect(byTestId('widget-card')).not.toBeNull();

    const cardsWrapper: HTMLElement | null = byTestId('widget-card')?.parentElement ?? null;
    expect(cardsWrapper?.className).toContain('@2xl/surface:hidden');

    const table: HTMLElement | null = root().querySelector('table');
    const tableWrapper: HTMLElement | null = table?.parentElement?.parentElement ?? null;
    expect(tableWrapper?.className).toContain('hidden');
    expect(tableWrapper?.className).toContain('@2xl/surface:block');
  });
});
