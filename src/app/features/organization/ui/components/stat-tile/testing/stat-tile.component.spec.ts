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

  it('appends queryParams to the link destination', async () => {
    await render();
    fixture.componentRef.setInput('link', ['/organizations', 'org-1', 'interventions']);
    fixture.componentRef.setInput('queryParams', { due: 'overdue' });
    await fixture.whenStable();

    const anchor: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');

    expect(anchor?.getAttribute('href')).toBe('/organizations/org-1/interventions?due=overdue');
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

  it('renders the delta as an outline pill in the header corner', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 8, direction: 'up', positiveIsGood: true });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const pill: HTMLElement | null = host.querySelector('[hlmCardAction] [hlmBadge]');

    expect(pill).not.toBeNull();
    expect(pill?.textContent).toContain('+8');
  });

  it('colours the delta arrow destructive for an undesirable direction, never the pill text', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 8, direction: 'up', positiveIsGood: false });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const arrow: HTMLElement | null = host.querySelector('[hlmCardAction] [hlmBadge] ng-icon');
    const pill: HTMLElement | null = host.querySelector('[hlmCardAction] [hlmBadge]');

    expect(arrow?.className).toContain('text-destructive');
    expect(pill?.className).not.toContain('text-destructive');
  });

  it('colours the delta arrow success for a desirable direction', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 3, direction: 'down', positiveIsGood: false });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const arrow: HTMLElement | null = host.querySelector('[hlmCardAction] [hlmBadge] ng-icon');

    expect(arrow?.className).toContain('text-success');
    expect(arrow?.className).not.toContain('text-destructive');
  });

  it('colours the delta arrow neutral for a flat delta', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 0, direction: 'flat', positiveIsGood: true });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const arrow: HTMLElement | null = host.querySelector('[hlmCardAction] [hlmBadge] ng-icon');

    expect(arrow?.className).toContain('text-muted-foreground');
    expect(arrow?.className).not.toContain('text-success');
    expect(arrow?.className).not.toContain('text-destructive');
  });

  it('renders no progress meter when none is given', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('hlm-progress')).toBeNull();
  });

  it('renders a progress meter for a zero percent value, not just a truthy one', async () => {
    await render();
    fixture.componentRef.setInput('progress', 0);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('hlm-progress')).not.toBeNull();
  });

  it('renders a progress meter at the given percentage', async () => {
    await render();
    fixture.componentRef.setInput('progress', 42);
    await fixture.whenStable();

    const meter: HTMLElement | null = fixture.nativeElement.querySelector('hlm-progress');

    expect(meter).not.toBeNull();
    expect(meter?.getAttribute('aria-valuenow')).toBe('42');
  });

  it('renders the delta pill instead of the plain icon when both are given', async () => {
    await render();
    fixture.componentRef.setInput('icon', 'lucideMinus');
    fixture.componentRef.setInput('delta', { value: 8, direction: 'up', positiveIsGood: true });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[hlmCardAction] [hlmBadge]')).not.toBeNull();
    expect(host.querySelector('[hlmCardAction] > ng-icon')).toBeNull();
  });

  it('renders the badge pill instead of the delta pill when both are given', async () => {
    await render();
    fixture.componentRef.setInput('delta', { value: 8, direction: 'up', positiveIsGood: true });
    fixture.componentRef.setInput('badge', {
      label: '3 overdue',
      icon: null,
      tone: 'destructive',
    });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[hlmCardAction]')?.textContent).toContain('3 overdue');
    expect(host.querySelector('[hlmCardAction]')?.textContent).not.toContain('+8');
  });

  it('keeps the icon on the neutral tone by default', async () => {
    await render();
    fixture.componentRef.setInput('icon', 'lucideTrendingUp');
    await fixture.whenStable();

    const icon: HTMLElement | null = fixture.nativeElement.querySelector('ng-icon');

    expect(icon?.className).toContain('text-muted-foreground');
    expect(icon?.className).not.toContain('text-destructive');
  });

  it('tints only the icon destructive for a destructive tone, never the value or the surface', async () => {
    await render();
    fixture.componentRef.setInput('icon', 'lucideTrendingUp');
    fixture.componentRef.setInput('tone', 'destructive');
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const icon: HTMLElement | null = host.querySelector('ng-icon');
    const value: HTMLElement | null = host.querySelector('p[hlmCardTitle]');
    const card: HTMLElement | null = host.querySelector('[hlmCard]');

    expect(icon?.className).toContain('text-destructive');
    expect(icon?.className).not.toContain('text-muted-foreground');
    expect(value?.className).not.toContain('text-destructive');
    expect(card?.className).not.toContain('text-destructive');
    expect(card?.className).not.toContain('border-destructive');
  });

  it('renders no badge and no footer by default', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('[hlmBadge]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[hlmCardFooter]')).toBeNull();
  });

  it('renders the badge pill in the header instead of the plain icon when both are given', async () => {
    await render();
    fixture.componentRef.setInput('icon', 'lucideTrendingUp');
    fixture.componentRef.setInput('badge', {
      label: '31% of total',
      icon: 'lucideTrendingUp',
      tone: 'neutral',
    });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const badge: HTMLElement | null = host.querySelector('[hlmBadge]');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('31% of total');
    expect(host.querySelector('[hlmCardAction] > ng-icon')).toBeNull();
  });

  it('tints only the badge icon destructive for a destructive badge tone', async () => {
    await render();
    fixture.componentRef.setInput('badge', {
      label: 'Needs attention',
      icon: 'lucideTrendingUp',
      tone: 'destructive',
    });
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const badgeIcon: HTMLElement | null = host.querySelector('[hlmBadge] ng-icon');
    const value: HTMLElement | null = host.querySelector('p[hlmCardTitle]');

    expect(badgeIcon?.className).toContain('text-destructive');
    expect(value?.className).not.toContain('text-destructive');
  });

  it('moves the description into a bordered footer alongside the caption headline when caption is given', async () => {
    await render();
    fixture.componentRef.setInput('description', 'Waiting on your decision');
    fixture.componentRef.setInput('caption', 'Submitted for review');
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const footer: HTMLElement | null = host.querySelector('[hlmCardFooter]');

    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain('Submitted for review');
    expect(footer?.textContent).toContain('Waiting on your decision');
  });

  it('promotes the value to its largest size once a caption is set', async () => {
    await render();
    fixture.componentRef.setInput('caption', 'Submitted for review');
    await fixture.whenStable();

    const value: HTMLElement | null = fixture.nativeElement.querySelector('p[hlmCardTitle]');

    expect(value?.className).toContain('text-3xl');
  });

  it('renders no icon beside the footer caption even when icon is set, since the caption text already states it', async () => {
    await render();
    fixture.componentRef.setInput('icon', 'lucideTrendingUp');
    fixture.componentRef.setInput('caption', 'Submitted for review');
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const footer: HTMLElement | null = host.querySelector('[hlmCardFooter]');

    expect(footer?.querySelector('ng-icon')).toBeNull();
  });
});
