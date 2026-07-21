import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { UserStore } from '@features/account/state';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import { AccountAccessPanel } from '../account-access-panel.component';

interface MockOrganizationStore {
  readonly organizations: WritableSignal<ReadonlyArray<OrganizationOutput>>;
  readonly isLoadingOrganizations: WritableSignal<boolean>;
  readonly loadOrganizations: ReturnType<typeof vi.fn<() => void>>;
}

interface SetupResult {
  readonly fixture: ComponentFixture<AccountAccessPanel>;
  readonly mockOrganizationStore: MockOrganizationStore;
}

const membership = (overrides: Partial<OrganizationOutput> = {}): OrganizationOutput =>
  ({
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Fireguard Nantes',
    slug: 'fireguard-nantes',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    memberCount: 3,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    isOwner: false,
    roles: [],
    ...overrides,
  }) as OrganizationOutput;

const textsOf = (fixture: ComponentFixture<AccountAccessPanel>, testId: string): string[] =>
  Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      `[data-testid="${testId}"]`,
    ),
  ).map((el: HTMLElement): string => el.textContent?.trim() ?? '');

describe('AccountAccessPanel', () => {
  const setup = (organizations: ReadonlyArray<OrganizationOutput> = []): SetupResult => {
    const mockUserStore = {
      roles: signal<ReadonlyArray<string>>([]),
      permissions: signal<ReadonlyArray<string>>([]),
    };
    const mockOrganizationStore: MockOrganizationStore = {
      organizations: signal<ReadonlyArray<OrganizationOutput>>(organizations),
      isLoadingOrganizations: signal<boolean>(false),
      loadOrganizations: vi.fn<() => void>(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: UserStore, useValue: mockUserStore }],
    });
    // The panel provides its own component-scoped OrganizationStore; swap the
    // provider so the spec never instantiates the real store (and its HTTP).
    TestBed.overrideComponent(AccountAccessPanel, {
      set: { providers: [{ provide: OrganizationStore, useValue: mockOrganizationStore }] },
    });

    const fixture: ComponentFixture<AccountAccessPanel> =
      TestBed.createComponent(AccountAccessPanel);
    fixture.detectChanges();
    return { fixture, mockOrganizationStore };
  };

  it('should load the organization list on init when nothing is cached', () => {
    const { mockOrganizationStore } = setup();

    expect(mockOrganizationStore.loadOrganizations).toHaveBeenCalledTimes(1);
  });

  it('should not reload when the list is already cached', () => {
    const { mockOrganizationStore } = setup([membership()]);

    expect(mockOrganizationStore.loadOrganizations).not.toHaveBeenCalled();
  });

  it('should render one membership row per organization with its name', () => {
    const { fixture } = setup([membership(), membership({ id: 'org-2', name: 'Fireguard Brest' })]);

    expect(textsOf(fixture, 'account-org-membership-name')).toEqual([
      'Fireguard Nantes',
      'Fireguard Brest',
    ]);
  });

  it('should show the Owner badge only on owned organizations', () => {
    const { fixture } = setup([
      membership({ isOwner: true }),
      membership({ id: 'org-2', name: 'Fireguard Brest', isOwner: false }),
    ]);

    const rows: NodeListOf<HTMLElement> = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLElement>('[data-testid="account-org-membership"]');

    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('[data-testid="account-org-owner"]')).not.toBeNull();
    expect(rows[1].querySelector('[data-testid="account-org-owner"]')).toBeNull();
  });

  it('should render one tag per assigned organization role', () => {
    const { fixture } = setup([
      membership({
        roles: [
          { id: 'role-1', label: 'fire_safety_officer' },
          { id: 'role-2', label: 'inspector' },
        ],
      }),
    ]);

    expect(textsOf(fixture, 'account-org-role')).toEqual(['fire_safety_officer', 'inspector']);
  });

  // A member without any assigned role is a valid state, not a rendering hole:
  // the row still shows the organization, just without role tags.
  it('should render a role-less membership row without tags', () => {
    const { fixture } = setup([membership({ roles: [] })]);

    expect(textsOf(fixture, 'account-org-membership-name')).toEqual(['Fireguard Nantes']);
    expect(textsOf(fixture, 'account-org-role')).toEqual([]);
  });

  it('should show the empty state when the user belongs to no organization', () => {
    const { fixture } = setup([]);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="account-org-memberships-empty"]',
      ),
    ).not.toBeNull();
  });

  it('should show the loading state while the list is in flight', () => {
    const { fixture, mockOrganizationStore } = setup([]);
    mockOrganizationStore.isLoadingOrganizations.set(true);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="account-org-memberships-loading"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="account-org-memberships-empty"]')).toBeNull();
  });
});
