import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { ApiError } from '@core/api/models';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
  type StoreError,
} from '@core/request-state';
import type { OrganizationOutput } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { ActiveOrganizationStore, OrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
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

interface SettingsStoreStub {
  readonly isLeaving: WritableSignal<boolean>;
  readonly leaveError: WritableSignal<StoreError | null>;
  readonly leaveCallState: WritableSignal<CallState<void>>;
  leave: (params: { organizationId: string }) => void;
}

describe('OrganizationSwitcher', () => {
  let routedId: WritableSignal<string | null>;
  let selected: WritableSignal<OrganizationOutput | null>;
  let loadingContext: WritableSignal<boolean>;
  let store: StoreStub;
  let loadCalls: number;
  let settingsStore: SettingsStoreStub;
  let leaveCalls: ReadonlyArray<{ organizationId: string }>;
  let clearActiveOrganization: ReturnType<typeof vi.fn>;

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
        { provide: ActiveOrganizationStore, useValue: { clear: clearActiveOrganization } },
      ],
    })
      .overrideComponent(OrganizationSwitcher, {
        remove: { providers: [OrganizationStore, OrganizationSettingsStore] },
        add: {
          providers: [
            { provide: OrganizationStore, useValue: store },
            { provide: OrganizationSettingsStore, useValue: settingsStore },
          ],
        },
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
    leaveCalls = [];
    clearActiveOrganization = vi.fn();
    settingsStore = {
      isLeaving: signal<boolean>(false),
      leaveError: signal<StoreError | null>(null),
      leaveCallState: signal<CallState<void>>(idleCallState()),
      leave: (params: { organizationId: string }): void => {
        leaveCalls = [...leaveCalls, params];
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

  it('offers Leave organization to a plain member holding no permission beyond membership', async () => {
    const fixture = await render();
    (fixture.nativeElement.querySelector('#organization-switcher-trigger') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const leaveItem: HTMLElement | null = document.querySelector(
      '[data-testid="organization-switcher-leave"]',
    );

    expect(leaveItem).not.toBeNull();
    expect(leaveItem?.textContent).toContain('Leave organization');
  });

  it('opens the leave dialog for the open organization and confirms into a leave call', async () => {
    const fixture = await render();
    (fixture.nativeElement.querySelector('#organization-switcher-trigger') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    (document.querySelector('[data-testid="organization-switcher-leave"]') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const confirmButton: HTMLElement | null = document.querySelector(
      '[data-testid="organization-leave-confirm"]',
    );
    expect(
      confirmButton?.closest('[data-testid="organization-leave-dialog"]')?.textContent,
    ).toContain('Acme Inc');

    confirmButton?.click();

    expect(leaveCalls).toEqual([{ organizationId: 'org-1' }]);
  });

  it("surfaces the backend's owner-cannot-leave 409 detail inline on the dialog", async () => {
    const apiError: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 409,
      type: 'about:blank',
      title: 'Conflict',
      detail: 'The organization owner cannot leave; transfer ownership to another member first.',
    };
    settingsStore.leaveError.set(toStoreError(apiError));

    const fixture = await render();
    (fixture.nativeElement.querySelector('#organization-switcher-trigger') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    (document.querySelector('[data-testid="organization-switcher-leave"]') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="organization-leave-error"]')?.textContent,
    ).toContain('The organization owner cannot leave; transfer ownership to another member first.');
  });

  it('clears the active organization and returns to the redirector once leaving succeeds', async () => {
    const fixture = await render();
    const router: Router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    settingsStore.leaveCallState.set(pendingCallState());
    fixture.detectChanges();
    settingsStore.leaveCallState.set(successCallState(undefined));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(clearActiveOrganization).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations']);
  });
});
