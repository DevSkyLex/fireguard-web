import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { OrganizationNav } from '../organization-nav.component';

describe('OrganizationNav', () => {
  let fixture: ComponentFixture<OrganizationNav>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;

  /**
   * The rendered destinations, in order.
   */
  function routes(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>,
    ).map((anchor: HTMLAnchorElement): string => anchor.getAttribute('href') ?? '');
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
      ],
    });

    fixture = TestBed.createComponent(OrganizationNav);
    await fixture.whenStable();
  });

  it('should render nothing while no organization is routed', async () => {
    selectedOrganizationId.set(null);
    permissions.set([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    await fixture.whenStable();

    // Otherwise the column would advertise links pointing at
    // `/organizations/null`.
    expect(routes()).toEqual([]);
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

    // Only Operations earns its place; Assets and Administration would render
    // as empty headings.
    expect(sections()).toEqual(['Operations']);
  });

  it('should honour a namespace wildcard grant', async () => {
    permissions.set(['organization.*']);
    await fixture.whenStable();

    expect(sections()).toEqual(['Operations', 'Assets', 'Administration']);
  });

  it('should expose the landing entry to whoever can read only the dashboard', async () => {
    // "Today" is an `any` match: either permission earns it, because the page
    // shows queues to one and the alert strip to the other.
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    await fixture.whenStable();

    expect(routes()).toContain('/organizations/org-1');
  });
});
