import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OrganizationRoleOutput,
  OrganizationRolePermissionEntry,
} from '@features/organization/models';
import { OrganizationRoleGrid } from '../organization-role-grid.component';

/** One permission entry, as the API embeds it inside a role's `permissions` list. */
function permission(name: string): OrganizationRolePermissionEntry {
  return { name, description: '' };
}

/**
 * Builds a role fixture. `permissions` defaults to a single entry so a test
 * that does not care about the badge preview still renders a valid card.
 */
function role(overrides: Partial<OrganizationRoleOutput> = {}): OrganizationRoleOutput {
  return {
    id: 'role-1',
    organizationId: 'org-1',
    name: 'Inspector',
    description: null,
    isSystem: false,
    permissions: [permission('organization.members.read')],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  } as OrganizationRoleOutput;
}

describe('OrganizationRoleGrid', () => {
  let fixture: ComponentFixture<OrganizationRoleGrid>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (
    items: readonly OrganizationRoleOutput[],
    options: { loading?: boolean; canManage?: boolean } = {},
  ): Promise<void> => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', options.loading ?? false);
    fixture.componentRef.setInput('canManage', options.canManage ?? false);
    await fixture.whenStable();
  };

  const cards = (): readonly HTMLElement[] => [
    ...root().querySelectorAll<HTMLElement>('[data-testid="organization-role-grid-card"]'),
  ];

  const openCardMenu = async (index = 0): Promise<void> => {
    const buttons: NodeListOf<HTMLButtonElement> = root().querySelectorAll(
      '[data-testid="organization-role-grid-card-menu"]',
    );
    buttons[index]?.click();
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationRoleGrid);
  });

  it('should split roles into System and Custom sections, each counted in its heading', async () => {
    await render([
      role({ id: 'role-1', isSystem: true, name: 'Owner' }),
      role({ id: 'role-2', isSystem: true, name: 'Manager' }),
      role({ id: 'role-3', isSystem: false, name: 'Inspector' }),
    ]);

    const sections: NodeListOf<HTMLElement> = root().querySelectorAll('section');

    expect(sections.length).toBe(2);
    expect(sections[0].querySelector('h2')?.textContent).toContain('System roles (2)');
    expect(sections[1].querySelector('h2')?.textContent).toContain('Custom roles (1)');
  });

  it('should render one card per role, split across both sections', async () => {
    await render([
      role({ id: 'role-1', isSystem: true, name: 'Owner' }),
      role({ id: 'role-2', isSystem: true, name: 'Manager' }),
      role({ id: 'role-3', isSystem: false, name: 'Inspector' }),
    ]);

    const sections: NodeListOf<HTMLElement> = root().querySelectorAll('section');

    expect(cards().length).toBe(3);
    expect(sections[0].querySelectorAll('[data-testid="organization-role-grid-card"]').length).toBe(
      2,
    );
    expect(sections[1].querySelectorAll('[data-testid="organization-role-grid-card"]').length).toBe(
      1,
    );
  });

  it('should preview permission groups, capping at 3 with a +N badge, in first-seen order', async () => {
    await render([
      role({
        permissions: [
          permission('organization.dashboard.read'),
          permission('organization.events.read'),
          permission('organization.members.read'),
          permission('organization.roles.read'),
          permission('organization.facilities.read'),
        ],
      }),
    ]);

    const badgeRow: HTMLElement | null = root().querySelector(
      '[data-testid="organization-role-grid-card-permission-groups"]',
    );
    const labels: readonly string[] = [...(badgeRow?.querySelectorAll('span') ?? [])].map(
      (element: Element): string => (element.textContent ?? '').trim(),
    );

    expect(labels).toEqual(['Dashboard', 'Events', 'Members', '+2']);
  });

  it('should dedupe repeated groups before capping the badge preview', async () => {
    await render([
      role({
        permissions: [
          permission('organization.members.read'),
          permission('organization.members.write'),
          permission('organization.members.manage'),
        ],
      }),
    ]);

    const badgeRow: HTMLElement | null = root().querySelector(
      '[data-testid="organization-role-grid-card-permission-groups"]',
    );
    const labels: readonly string[] = [...(badgeRow?.querySelectorAll('span') ?? [])].map(
      (element: Element): string => (element.textContent ?? '').trim(),
    );

    expect(labels).toEqual(['Members']);
  });

  it('should omit the permission-groups row entirely when a role has no permissions', async () => {
    await render([role({ permissions: [] })]);

    expect(
      root().querySelector('[data-testid="organization-role-grid-card-permission-groups"]'),
    ).toBeNull();
  });

  it('should omit the member-count label when the field is absent', async () => {
    await render([role({ memberCount: undefined })]);

    expect(
      root().querySelector('[data-testid="organization-role-grid-card-member-count"]'),
    ).toBeNull();
  });

  it('should render an explicit zero member count rather than omitting it', async () => {
    await render([role({ memberCount: 0 })]);

    expect(
      root().querySelector('[data-testid="organization-role-grid-card-member-count"]')?.textContent,
    ).toContain('0 members');
  });

  it('should pluralize a single member correctly', async () => {
    await render([role({ memberCount: 1 })]);

    expect(
      root().querySelector('[data-testid="organization-role-grid-card-member-count"]')?.textContent,
    ).toContain('1 member');
    expect(
      root().querySelector('[data-testid="organization-role-grid-card-member-count"]')?.textContent,
    ).not.toContain('1 members');
  });

  it('should pluralize several members correctly', async () => {
    await render([role({ memberCount: 5 })]);

    expect(
      root().querySelector('[data-testid="organization-role-grid-card-member-count"]')?.textContent,
    ).toContain('5 members');
  });

  it('should say so plainly when there are no roles at all', async () => {
    await render([]);

    expect(root().querySelectorAll('section').length).toBe(0);
    expect(cards().length).toBe(0);
    expect(root().textContent).toContain('No roles found.');
  });

  it('should show a button-less custom empty-state only when custom roles are manageable', async () => {
    await render([role({ id: 'role-1', isSystem: true, name: 'Owner' })], { canManage: true });

    const emptyState: HTMLElement | null = root().querySelector('app-empty-state');

    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('No custom roles yet');
    expect(emptyState?.querySelector('button')).toBeNull();
  });

  it('should show no custom empty-state when the caller cannot manage roles', async () => {
    await render([role({ id: 'role-1', isSystem: true, name: 'Owner' })], { canManage: false });

    expect(root().querySelector('app-empty-state')).toBeNull();
  });

  it('should draw skeleton cards while loading, and no data cards or sections', async () => {
    await render([role()], { loading: true });

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(cards().length).toBe(0);
    expect(root().querySelectorAll('section').length).toBe(0);
  });

  it('should offer the menu on a manageable custom role', async () => {
    await render([role({ isSystem: false })], { canManage: true });

    expect(root().querySelector('[data-testid="organization-role-grid-card-menu"]')).not.toBeNull();
  });

  it('should offer no menu on a custom role when the caller cannot manage roles', async () => {
    await render([role({ isSystem: false })], { canManage: false });

    expect(root().querySelector('[data-testid="organization-role-grid-card-menu"]')).toBeNull();
  });

  it('should offer no menu on a system role even when the caller can manage roles', async () => {
    await render([role({ isSystem: true })], { canManage: true });

    expect(root().querySelector('[data-testid="organization-role-grid-card-menu"]')).toBeNull();
  });

  it('should emit the card role when Edit permissions is chosen', async () => {
    const emitted: OrganizationRoleOutput[] = [];
    fixture.componentInstance.editPermissionsRequested.subscribe(
      (value: OrganizationRoleOutput): void => {
        emitted.push(value);
      },
    );

    await render([role({ id: 'role-9', isSystem: false })], { canManage: true });
    await openCardMenu();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="organization-role-grid-card-edit-permissions"]',
      )
      ?.click();

    expect(emitted).toEqual([role({ id: 'role-9', isSystem: false })]);
  });

  it('should emit the card role when Delete is chosen', async () => {
    const emitted: OrganizationRoleOutput[] = [];
    fixture.componentInstance.deleteRequested.subscribe((value: OrganizationRoleOutput): void => {
      emitted.push(value);
    });

    await render([role({ id: 'role-9', isSystem: false })], { canManage: true });
    await openCardMenu();
    document
      .querySelector<HTMLButtonElement>('[data-testid="organization-role-grid-card-delete"]')
      ?.click();

    expect(emitted).toEqual([role({ id: 'role-9', isSystem: false })]);
  });
});
