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
      [hasLoaded]="hasLoaded()"
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
  public readonly hasLoaded = signal(false);
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
    expect(root().querySelectorAll('hlm-skeleton')).toHaveLength(0);
    expect(root().querySelector('[role="status"]')).toBeNull();
  });

  it('uses a subtle tonal wash for alternating table rows', () => {
    const body: HTMLElement | null = root().querySelector('tbody');

    expect(body?.className).toContain('even:bg-muted/20');
    expect(body?.className).not.toContain('even:bg-muted/40');
  });

  it('keeps a previously loaded empty result visible while refreshing', async () => {
    fixture.componentInstance.hasLoaded.set(true);
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.rowCount.set(0);
    await fixture.whenStable();
    expect(byTestId('widget-empty')).not.toBeNull();
    expect(root().querySelectorAll('hlm-skeleton')).toHaveLength(0);
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Refreshing');
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
    expect(root().querySelectorAll('hlm-skeleton')).toHaveLength(0);
  });

  it('announces refresh without replacing the rows or changing table structure', async () => {
    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    expect(byTestId('widget-row')).not.toBeNull();
    expect(root().querySelector('app-collection-surface')?.getAttribute('aria-busy')).toBe('true');
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Refreshing');
    expect(root().querySelectorAll('hlm-skeleton')).toHaveLength(0);
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

  it('gates card presentation by mobile interaction mode before its container breakpoint', () => {
    expect(byTestId('widget-card')).not.toBeNull();

    const cardsWrapper: HTMLElement | null = byTestId('widget-card')?.parentElement ?? null;
    expect(cardsWrapper?.className.split(' ')).toContain('hidden');
    expect(cardsWrapper?.className.split(' ')).toContain('mobile-ui:flex');
    expect(cardsWrapper?.className.split(' ')).toContain('mobile-ui:@2xl/surface:hidden');

    const table: HTMLElement | null = root().querySelector('table');
    const tableWrapper: HTMLElement | null = table?.parentElement?.parentElement ?? null;
    expect(tableWrapper?.className.split(' ')).toContain('block');
    expect(tableWrapper?.className.split(' ')).not.toContain('hidden');
    expect(tableWrapper?.className.split(' ')).toContain('mobile-ui:hidden');
    expect(tableWrapper?.className.split(' ')).toContain('mobile-ui:@2xl/surface:block');
  });
});
