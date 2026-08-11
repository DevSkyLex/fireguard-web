import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StatTile } from '../stat-tile.component';

describe('StatTile', () => {
  let fixture: ComponentFixture<StatTile>;

  async function render(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(StatTile);
    fixture.componentRef.setInput('label', 'Open non-conformities');
    fixture.componentRef.setInput('value', 12);
    await fixture.whenStable();
  }

  it('renders the label and value', async () => {
    await render();

    expect(fixture.nativeElement.textContent).toContain('Open non-conformities');
    expect(fixture.nativeElement.textContent).toContain('12');
  });

  it('renders as a plain card when no link is given', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('div[hlmCard]')).not.toBeNull();
  });

  it('renders as a linked, focusable anchor when a link is given', async () => {
    await render();
    fixture.componentRef.setInput('link', ['/organizations', 'org-1', 'inspections']);
    await fixture.whenStable();

    const anchor: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');

    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('/organizations/org-1/inspections');
    expect(fixture.nativeElement.querySelector('div[hlmCard]')).toBeNull();
  });

  it('shows skeletons instead of the value and description while loading', async () => {
    await render();
    fixture.componentRef.setInput('description', 'vs previous period');
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).not.toContain('12');
    expect(fixture.nativeElement.textContent).not.toContain('vs previous period');
  });

  it('renders the description when given and not loading', async () => {
    await render();
    fixture.componentRef.setInput('description', '3 overdue');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('3 overdue');
  });

  it('renders no delta block when none is given', async () => {
    await render();

    expect(fixture.nativeElement.textContent).not.toContain('Increase');
    expect(fixture.nativeElement.textContent).not.toContain('Decrease');
  });

  it('renders a signed magnitude and the sr-only sentiment for an upward delta', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 8, direction: 'up', positiveIsGood: false });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('+8');
    expect(fixture.nativeElement.textContent).toContain('Increase');
  });

  it('renders a signed magnitude and the sr-only sentiment for a downward delta', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 3, direction: 'down', positiveIsGood: true });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('−3');
    expect(fixture.nativeElement.textContent).toContain('Decrease');
  });

  it('renders the sr-only "no change" sentiment for a flat delta', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 0, direction: 'flat', positiveIsGood: true });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No change');
  });

  it('weighs an undesirable direction as muted rather than emphasized', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 8, direction: 'up', positiveIsGood: false });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const magnitude: HTMLElement | undefined = Array.from(
      host.querySelectorAll<HTMLElement>('span'),
    ).find((span): boolean => span.textContent?.includes('+8') ?? false);

    expect(magnitude?.className).toContain('text-muted-foreground');
    expect(magnitude?.className).not.toContain('font-medium');
  });

  it('weighs a desirable direction as emphasized rather than muted', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 8, direction: 'up', positiveIsGood: true });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const magnitude: HTMLElement | undefined = Array.from(
      host.querySelectorAll<HTMLElement>('span'),
    ).find((span): boolean => span.textContent?.includes('+8') ?? false);

    expect(magnitude?.className).toContain('font-medium');
    expect(magnitude?.className).toContain('text-foreground');
  });
});
