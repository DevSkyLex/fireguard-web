import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { OrganizationOutput } from '@features/organization/models';
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

describe('OrganizationSwitcher', () => {
  let routedId: WritableSignal<string | null>;
  let selected: WritableSignal<OrganizationOutput | null>;
  let loadingContext: WritableSignal<boolean>;
  let store: StoreStub;
  let loadCalls: number;

  async function render(): Promise<ComponentFixture<OrganizationSwitcher>> {
    const context: OrganizationContextPort = {
      selectedOrganizationId: routedId,
      selectedOrganization: selected,
      isLoadingOrganization: loadingContext,
    };

    await TestBed.configureTestingModule({
      imports: [OrganizationSwitcher],
      providers: [provideRouter([]), { provide: ORGANIZATION_CONTEXT_PORT, useValue: context }],
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

  it('separates the list from the create action', async () => {
    const withList = await render();
    (withList.nativeElement.querySelector('#organization-switcher-trigger') as HTMLElement).click();
    withList.detectChanges();
    await withList.whenStable();

    expect(document.querySelector('hlm-dropdown-menu-separator')).not.toBeNull();
    expect(document.querySelector('hlm-dropdown-menu-label')).not.toBeNull();
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
    (fixture.nativeElement.querySelector('#organization-switcher-trigger') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.querySelectorAll('[aria-current="true"]').length).toBe(1);
  });
});
