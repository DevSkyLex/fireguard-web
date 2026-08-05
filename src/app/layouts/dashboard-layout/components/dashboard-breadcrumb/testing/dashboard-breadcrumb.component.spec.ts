import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BreadcrumbService, type BreadcrumbItem } from '@core/breadcrumb';
import { DashboardBreadcrumb } from '../dashboard-breadcrumb.component';

describe('DashboardBreadcrumb', () => {
  let fixture: ComponentFixture<DashboardBreadcrumb>;
  let items: WritableSignal<BreadcrumbItem[]>;

  /**
   * The rendered steps after home, in order.
   */
  function steps(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('li:not(:first-child)') as NodeListOf<HTMLElement>,
    )
      .map((step: HTMLElement): string => step.textContent?.trim() ?? '')
      .filter((text: string): boolean => text.length > 0);
  }

  beforeEach(async () => {
    items = signal<BreadcrumbItem[]>([]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: BreadcrumbService,
          useValue: { home: signal<BreadcrumbItem>({ routerLink: '/', current: false }), items },
        },
      ],
    });

    fixture = TestBed.createComponent(DashboardBreadcrumb);
    await fixture.whenStable();
  });

  it('should always offer the way home', () => {
    const home = fixture.nativeElement.querySelector('a[href="/"]') as HTMLAnchorElement;

    // A glyph, so it needs an accessible name of its own.
    expect(home).not.toBeNull();
    expect(home.getAttribute('aria-label')).toBe('Workspace home');
  });

  it('should render nothing but home when the trail is empty', () => {
    expect(steps()).toEqual([]);
  });

  it('should render each step in order', async () => {
    items.set([
      { label: 'Interventions', routerLink: '/organizations/org-1/interventions', current: false },
      { label: 'FG-101', current: true },
    ]);
    await fixture.whenStable();

    expect(steps()).toEqual(['Interventions', 'FG-101']);
  });

  it('should link the steps behind the current one, and only those', async () => {
    items.set([
      { label: 'Interventions', routerLink: '/organizations/org-1/interventions', current: false },
      { label: 'FG-101', routerLink: '/organizations/org-1/interventions/i-1', current: true },
    ]);
    await fixture.whenStable();

    // The last step is where the user already is: a link back to the current
    // page is noise, and screen readers announce it as a destination.
    expect(
      fixture.nativeElement.querySelector('a[href="/organizations/org-1/interventions"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('a[href="/organizations/org-1/interventions/i-1"]'),
    ).toBeNull();
  });

  it('should render a step with no route as plain text', async () => {
    items.set([{ label: 'Settings', current: false }]);
    await fixture.whenStable();

    expect(steps()).toEqual(['Settings']);
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(1);
  });

  it('should truncate rather than wrap', () => {
    // The header is one row; pushing the tool cluster off the card is worse
    // than eliding a long label.
    const list = fixture.nativeElement.querySelector('ol') as HTMLElement;

    expect(list.className).toContain('flex-nowrap');
  });
});
