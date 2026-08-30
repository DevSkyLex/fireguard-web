import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgIconsToken } from '@ng-icons/core';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_NAVIGATION_ITEMS,
  type OrganizationNavigationItem,
} from '@features/organization/navigation';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { OrganizationNavigationCountersStore } from '@features/organization/state';
import { OrganizationNav } from '../organization-nav.component';

describe('OrganizationNav', () => {
  let fixture: ComponentFixture<OrganizationNav>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let submittedInterventions: WritableSignal<number>;

  /**
   * The rendered destinations, in order.
   */
  function routes(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>,
    ).map((anchor: HTMLAnchorElement): string => anchor.getAttribute('href') ?? '');
  }

  /**
   * The rendered rows, in order, whether or not they lead anywhere.
   */
  function rows(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-slot="sidebar-menu-button"]',
      ) as NodeListOf<HTMLElement>,
    ).map((row: HTMLElement): string => row.textContent?.trim() ?? '');
  }

  /**
   * The rendered section headings, in order.
   */
  function sections(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-slot="sidebar-group-label"]',
      ) as NodeListOf<HTMLElement>,
    ).map((heading: HTMLElement): string => heading.textContent?.trim() ?? '');
  }

  beforeEach(async () => {
    selectedOrganizationId = signal<string | null>('org-1');
    permissions = signal<ReadonlyArray<string>>([]);
    submittedInterventions = signal<number>(0);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId,
            selectedOrganization: signal(null),
            isLoadingOrganization: signal(false),
          },
        },
        { provide: OrganizationPermissionService, useValue: { permissions } },
        { provide: OrganizationNavigationCountersStore, useValue: { submittedInterventions } },
      ],
    });

    fixture = TestBed.createComponent(OrganizationNav);
    await fixture.whenStable();
  });

  it('should render nothing before any organization has been selected', async () => {
    selectedOrganizationId.set(null);
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    await fixture.whenStable();

    expect(rows()).toEqual([]); // Nothing to name yet, so no block at all.
  });

  it('should never render an inert row', async () => {
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    await fixture.whenStable();

    expect(rows()).toEqual(['Dashboard', 'Interventions']);
    expect(fixture.nativeElement.querySelectorAll('[aria-disabled="true"]').length).toBe(0);
  });

  it('should render nothing for a member granted nothing', () => {
    expect(routes()).toEqual([]);
  });

  it('should prefix every destination with the routed organization', async () => {
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    await fixture.whenStable();

    expect(routes()).toEqual(['/organizations/org-1', '/organizations/org-1/interventions']);
  });

  it('should drop a section whose destinations are all denied', async () => {
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    await fixture.whenStable();

    // Only Operations earns its place; Assets would render as an empty heading.
    expect(sections()).toEqual(['Operations']);
  });

  it('should honour a namespace wildcard grant', async () => {
    permissions.set(['organization.*']);
    await fixture.whenStable();

    expect(sections()).toEqual(['Operations', 'Assets']);
  });

  it('should expose the landing entry to whoever can read only the dashboard', async () => {
    // "Today" is an `any` match: either permission earns it, because the page
    // shows queues to one and the alert strip to the other.
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    await fixture.whenStable();

    expect(routes()).toContain('/organizations/org-1');
  });

  it('should render the submitted-interventions badge on the Interventions row only, singular', async () => {
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    submittedInterventions.set(1);
    await fixture.whenStable();

    const badges = fixture.nativeElement.querySelectorAll(
      '[data-slot="sidebar-menu-button"] [hlmbadge]',
    ) as NodeListOf<HTMLElement>;

    expect(badges.length).toBe(1);
    expect(badges[0].textContent?.trim()).toBe('1');
    expect(badges[0].getAttribute('aria-label')).toBe('1 intervention awaiting review');
    expect(badges[0].closest('a')?.textContent).toContain('Interventions');
  });

  it('should render the plural badge label for more than one submitted intervention', async () => {
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    submittedInterventions.set(5);
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector(
      '[data-slot="sidebar-menu-button"] [hlmbadge]',
    ) as HTMLElement;

    expect(badge.textContent?.trim()).toBe('5');
    expect(badge.getAttribute('aria-label')).toBe('5 interventions awaiting review');
  });

  it('should render no badge anywhere when the count is zero', async () => {
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    submittedInterventions.set(0);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelectorAll('[data-slot="sidebar-menu-button"] [hlmbadge]').length,
    ).toBe(0);
  });

  it('should never carry a badge on a row without a counterKey', async () => {
    permissions.set(['organization.*']);
    submittedInterventions.set(3);
    await fixture.whenStable();

    const badges = fixture.nativeElement.querySelectorAll(
      '[data-slot="sidebar-menu-button"] [hlmbadge]',
    ) as NodeListOf<HTMLElement>;

    expect(badges.length).toBe(1);
    expect(badges[0].closest('a')?.textContent).toContain('Interventions');
  });

  /**
   * The lucide names `provideIcons` actually bound on this component,
   * merged the same way `@ng-icons/core` itself merges its multi providers.
   */
  function registeredIconNames(): ReadonlySet<string> {
    const dictionaries: readonly Record<string, string>[] =
      fixture.debugElement.injector.get(NgIconsToken);

    return new Set<string>(
      dictionaries.flatMap((dictionary: Record<string, string>): string[] =>
        Object.keys(dictionary),
      ),
    );
  }

  it('should register every icon the navigation config declares', () => {
    const declared = new Set<string>(
      ORGANIZATION_NAVIGATION_ITEMS.map((item: OrganizationNavigationItem): string => item.icon),
    );
    const missing = [...declared].filter(
      (icon: string): boolean => !registeredIconNames().has(icon),
    );

    expect(missing).toEqual([]);
  });

  it('should carry no icon the navigation config never declares', () => {
    const declared = new Set<string>(
      ORGANIZATION_NAVIGATION_ITEMS.map((item: OrganizationNavigationItem): string => item.icon),
    );
    const orphaned = [...registeredIconNames()].filter(
      (icon: string): boolean => !declared.has(icon),
    );

    expect(orphaned).toEqual([]);
  });
});
