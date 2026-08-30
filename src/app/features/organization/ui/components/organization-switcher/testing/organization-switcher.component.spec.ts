import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION, type OrganizationOutput } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationStore } from '@features/organization/state';
import { OrganizationSwitcher } from '../organization-switcher.component';

function organization(
  id: string,
  name: string,
  planName: string | null = null,
): OrganizationOutput {
  return {
    '@id': `/api/organizations/${id}`,
    '@type': 'Organization',
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    memberCount: 1,
    planName,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };
}

interface StoreStub {
  readonly organizations: WritableSignal<readonly OrganizationOutput[]>;
  readonly isLoadingOrganizations: WritableSignal<boolean>;
  loadOrganizations: () => void;
}

async function openMenu(fixture: ComponentFixture<OrganizationSwitcher>): Promise<void> {
  (fixture.nativeElement.querySelector('#organization-switcher-trigger') as HTMLElement).click();
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('OrganizationSwitcher', () => {
  let routedId: WritableSignal<string | null>;
  let selected: WritableSignal<OrganizationOutput | null>;
  let loadingContext: WritableSignal<boolean>;
  let store: StoreStub;
  let loadCalls: number;
  let hasAnyPermission: ReturnType<typeof vi.fn>;
  let hasAllPermissions: ReturnType<typeof vi.fn>;

  async function render(): Promise<ComponentFixture<OrganizationSwitcher>> {
    const context: OrganizationContextPort = {
      selectedOrganizationId: routedId,
      selectedOrganization: selected,
      isLoadingOrganization: loadingContext,
    };

    await TestBed.configureTestingModule({
      imports: [OrganizationSwitcher],
      providers: [
        provideRouter([]),
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: context },
        {
          provide: OrganizationPermissionService,
          useValue: { hasAnyPermission, hasAllPermissions },
        },
      ],
    })
      .overrideComponent(OrganizationSwitcher, {
        remove: { providers: [OrganizationStore] },
        add: { providers: [{ provide: OrganizationStore, useValue: store }] },
      })
      .compileComponents();

    const fixture: ComponentFixture<OrganizationSwitcher> =
      TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    return fixture;
  }

  beforeEach(() => {
    loadCalls = 0;
    routedId = signal<string | null>('org-1');
    selected = signal<OrganizationOutput | null>(organization('org-1', 'Acme Inc', 'Enterprise'));
    loadingContext = signal<boolean>(false);
    store = {
      organizations: signal<readonly OrganizationOutput[]>([
        organization('org-1', 'Acme Inc'),
        organization('org-2', 'Globex'),
      ]),
      isLoadingOrganizations: signal<boolean>(false),
      loadOrganizations: (): void => {
        loadCalls += 1;
      },
    };
    hasAnyPermission = vi.fn().mockReturnValue(true);
    hasAllPermissions = vi.fn().mockReturnValue(true);
  });

  it('renders the routed organization with the paired-chevrons affordance', async () => {
    const fixture = await render();
    const trigger: HTMLElement | null = fixture.nativeElement.querySelector(
      '#organization-switcher-trigger',
    );

    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain('Acme Inc');
    expect(trigger?.textContent).toContain('Enterprise');
    // The chevrons are what say the row is a control rather than a heading.
    expect(trigger?.querySelector('ng-icon[name="lucideChevronsUpDown"]')).not.toBeNull();
  });

  it('falls back to initials when the organization has no logo', async () => {
    const fixture = await render();

    expect(
      fixture.nativeElement.querySelector('#organization-switcher-trigger')?.textContent,
    ).toContain('AI');
    expect(fixture.nativeElement.querySelector('#organization-switcher-trigger img')).toBeNull();
  });

  it('shows a skeleton instead of an empty row while nothing is known yet', async () => {
    routedId.set(null);
    selected.set(null);
    loadingContext.set(true);
    store.organizations.set([]);

    const fixture = await render();

    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#organization-switcher-trigger')).toBeNull();
  });

  it('names the remembered organization from the list when its resource has not resolved', async () => {
    selected.set(null);

    const fixture = await render();
    const trigger: HTMLElement | null = fixture.nativeElement.querySelector(
      '#organization-switcher-trigger',
    );

    expect(trigger?.textContent).toContain('Acme Inc');
  });

  it('loads the organization list once when nothing has fetched it', async () => {
    store.organizations.set([]);

    await render();

    expect(loadCalls).toBe(1);
  });

  it('does not refetch a list that is already there', async () => {
    await render();

    expect(loadCalls).toBe(0);
  });

  it('repeats the trigger identity in the menu header', async () => {
    const fixture = await render();
    await openMenu(fixture);

    const header: HTMLElement | null = document.querySelector('hlm-dropdown-menu > div');
    expect(header?.textContent).toContain('Acme Inc');
    expect(header?.textContent).toContain('Enterprise');
  });

  it('navigates to the picked organization and ignores the active one', async () => {
    const fixture = await render();
    const router: Router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance as unknown as {
      select: (option: { id: string; active: boolean }) => void;
    };

    component.select({ id: 'org-2', active: false });
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-2']);

    navigate.mockClear();
    component.select({ id: 'org-1', active: true });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('marks the open organization in the menu', async () => {
    const fixture = await render();
    await openMenu(fixture);

    expect(document.querySelectorAll('[aria-current="true"]').length).toBe(1);
  });

  it('renders all four admin shortcuts when every permission is granted', async () => {
    const fixture = await render();
    await openMenu(fixture);

    const labels: ReadonlyArray<string> = Array.from(
      document.querySelectorAll('a[hlmDropdownMenuItem]'),
    ).map((element: Element): string => element.textContent?.trim() ?? '');

    expect(labels).toEqual(['Settings', 'Billing', 'Members', 'Audit journal']);
    const settingsLink: HTMLAnchorElement | null = document.querySelector('a[hlmDropdownMenuItem]');
    expect(settingsLink?.getAttribute('href')).toBe('/organizations/org-1/settings');
  });

  it('points Billing at the settings route with the subscription tab query param', async () => {
    const fixture = await render();
    await openMenu(fixture);

    const links: ReadonlyArray<HTMLAnchorElement> = Array.from(
      document.querySelectorAll('a[hlmDropdownMenuItem]'),
    );
    const billingLink: HTMLAnchorElement | undefined = links.find(
      (link) => link.textContent?.trim() === 'Billing',
    );

    expect(billingLink?.getAttribute('href')).toBe(
      '/organizations/org-1/settings?tab=subscription',
    );
  });

  it('drops the Settings and Billing shortcuts for a member without SETTINGS_WRITE', async () => {
    hasAllPermissions.mockImplementation(
      (permissions: ReadonlyArray<string>): boolean =>
        !permissions.includes(ORGANIZATION_PERMISSION.SETTINGS_WRITE),
    );

    const fixture = await render();
    await openMenu(fixture);

    const labels: ReadonlyArray<string> = Array.from(
      document.querySelectorAll('a[hlmDropdownMenuItem]'),
    ).map((element: Element): string => element.textContent?.trim() ?? '');

    expect(labels).toEqual(['Members', 'Audit journal']);
  });

  it('drops the Audit journal shortcut for a member without AUDIT_READ', async () => {
    hasAllPermissions.mockImplementation(
      (permissions: ReadonlyArray<string>): boolean =>
        !permissions.includes(ORGANIZATION_PERMISSION.AUDIT_READ),
    );

    const fixture = await render();
    await openMenu(fixture);

    const labels: ReadonlyArray<string> = Array.from(
      document.querySelectorAll('a[hlmDropdownMenuItem]'),
    ).map((element: Element): string => element.textContent?.trim() ?? '');

    expect(labels).toEqual(['Settings', 'Billing', 'Members']);
  });

  it('drops the whole admin block, separator included, when no permission is granted', async () => {
    hasAnyPermission.mockReturnValue(false);
    hasAllPermissions.mockReturnValue(false);

    const fixture = await render();
    await openMenu(fixture);

    expect(document.querySelectorAll('a[hlmDropdownMenuItem]').length).toBe(0);
    expect(document.querySelectorAll('hlm-dropdown-menu-separator').length).toBe(2);
  });

  it('caps the organization list panel to a bounded height and scrolls the rest', async () => {
    store.organizations.set([
      organization('org-1', 'Acme Inc'),
      organization('org-2', 'Globex'),
      organization('org-3', 'Initech'),
      organization('org-4', 'Umbrella'),
      organization('org-5', 'Soylent'),
    ]);

    const fixture = await render();
    await openMenu(fixture);

    const panel: HTMLElement | null = document.querySelector(
      '[data-testid="organization-switcher-list"]',
    );

    expect(panel).not.toBeNull();
    expect(panel?.querySelectorAll('button[hlmDropdownMenuItem]').length).toBe(5);
  });
});
