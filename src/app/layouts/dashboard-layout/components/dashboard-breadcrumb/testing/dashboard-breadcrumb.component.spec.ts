import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BreadcrumbService, type BreadcrumbItem } from '@core/breadcrumb';
import { DashboardBreadcrumb } from '../dashboard-breadcrumb.component';

describe('DashboardBreadcrumb', () => {
  let fixture: ComponentFixture<DashboardBreadcrumb>;
  let items: WritableSignal<BreadcrumbItem[]>;

  /**
   * Function steps
   * @description Returns the rendered named breadcrumb levels in order.
   * @access private
   * @since 1.0.0
   * @returns {readonly string[]}
   */
  function steps(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('li:not(:first-child)') as NodeListOf<HTMLElement>,
    )
      .filter(
        (step: HTMLElement): boolean =>
          step.querySelector('[data-testid="dashboard-breadcrumb-more"]') === null,
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

  it('should expose intermediate levels through a narrow-screen ellipsis menu', async () => {
    items.set([
      { label: 'Acme Corp', routerLink: '/organizations/org-1', current: false },
      { label: 'Interventions', routerLink: '/organizations/org-1/interventions', current: false },
      { label: 'FG-101', current: true },
    ]);
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-breadcrumb-more"]',
    ) as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('More pages');

    trigger.click();
    await fixture.whenStable();

    const menu = document.querySelector('[data-slot="dropdown-menu"]');
    expect(menu?.textContent).toContain('Acme Corp');
    expect(menu?.textContent).toContain('Interventions');
    expect(menu?.textContent).not.toContain('FG-101');
  });

  it('should link the steps behind the current one, and only those', async () => {
    items.set([
      { label: 'Interventions', routerLink: '/organizations/org-1/interventions', current: false },
      { label: 'FG-101', routerLink: '/organizations/org-1/interventions/i-1', current: true },
    ]);
    await fixture.whenStable();

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
    const list = fixture.nativeElement.querySelector('ol') as HTMLElement;

    expect(list.className).toContain('flex-nowrap');
  });

  it('should render the current step as a non-heading, aria-current page marker', async () => {
    items.set([{ label: 'FG-101', current: true }]);
    await fixture.whenStable();

    const current = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-breadcrumb-current"]',
    );

    expect(current?.textContent?.trim()).toBe('FG-101');
    expect(current?.tagName).toBe('SPAN');
    expect(current?.getAttribute('aria-current')).toBe('page');
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(0);
  });

  it('should render no current marker at all when no step is current', async () => {
    items.set([{ label: 'Acme Corp', routerLink: '/organizations/org-1', current: false }]);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-breadcrumb-current"]'),
    ).toBeNull();
  });
});
