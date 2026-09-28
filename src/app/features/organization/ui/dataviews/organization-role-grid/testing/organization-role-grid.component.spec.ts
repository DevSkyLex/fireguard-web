import { LOCALE_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type {
  OrganizationRoleOutput,
  OrganizationRolePermissionEntry,
} from '@features/organization/models';
import { OrganizationRoleGrid } from '../organization-role-grid.component';

/** Applied-light theme stub, satisfying `StateIllustration`/`ResourceIllustration` without a real `ThemeService`. */
const THEME_PORT_STUB = {
  theme: signal('system'),
  resolvedTheme: signal('light'),
  setTheme: vi.fn(),
} satisfies ThemePort;

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
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: THEME_PORT, useValue: THEME_PORT_STUB },
      ],
    });

    fixture = TestBed.createComponent(OrganizationRoleGrid);
  });

  it('should split roles into System and Custom sections, each counted in its heading', async () => {
    await render([
      role({ id: 'role-1', isSystem: true, name: 'Owner' }),
      role({ id: 'role-2', isSystem: true, name: 'Manager' }),
      role({ id: 'role-3', isSystem: false, name: 'Inspector' }),
    ]);

    const sections: NodeListOf<HTMLElement> = root().querySelectorAll('section');

    expect(sections).toHaveLength(2);
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

    expect(cards()).toHaveLength(3);
    expect(
      sections[0].querySelectorAll('[data-testid="organization-role-grid-card"]'),
    ).toHaveLength(2);
    expect(
      sections[1].querySelectorAll('[data-testid="organization-role-grid-card"]'),
    ).toHaveLength(1);
  });

  it('should preview every permission group, uncapped, in first-seen order', async () => {
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

    expect(labels).toEqual(['Dashboard', 'Events', 'Members', 'Roles', 'Facilities']);
  });

  it('should dedupe repeated groups in the badge preview', async () => {
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

  it('should show the real zero count, not a hardcoded one, in a locale where zero takes the singular form', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: THEME_PORT, useValue: THEME_PORT_STUB },
      ],
    });
    fixture = TestBed.createComponent(OrganizationRoleGrid);

    await render([role({ permissions: [], memberCount: 0 })]);

    const permissionCount: string | undefined = root().querySelector(
      '.text-sm.text-muted-foreground.tabular-nums',
    )?.textContent;
    expect(permissionCount).toContain('0 permission');
    expect(permissionCount).not.toContain('1 permission');

    const memberCount: string | undefined = root().querySelector(
      '[data-testid="organization-role-grid-card-member-count"]',
    )?.textContent;
    expect(memberCount).toContain('0 member');
    expect(memberCount).not.toContain('1 member');
  });

  it('should say so plainly when there are no roles at all', async () => {
    await render([]);

    expect(root().querySelectorAll('section')).toHaveLength(0);
    expect(cards()).toHaveLength(0);
    expect(root().textContent).toContain('No roles found.');
  });

  it('should offer a New role action from the empty custom-roles state to a manager', async () => {
    await render([role({ id: 'role-1', isSystem: true, name: 'Owner' })], { canManage: true });

    const emptyState: HTMLElement | null = root().querySelector(
      '[data-slot="empty"]:not([role="alert"])',
    );

    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('No custom roles yet');
    expect(root().querySelector('[data-testid="organization-role-grid-create"]')).not.toBeNull();
  });

  it('should emit createRequested when the empty-state New role action is activated', async () => {
    const emitted: void[] = [];
    fixture.componentInstance.createRequested.subscribe(() => emitted.push(undefined));

    await render([role({ id: 'role-1', isSystem: true, name: 'Owner' })], { canManage: true });
    root()
      .querySelector<HTMLButtonElement>('[data-testid="organization-role-grid-create"]')
      ?.click();

    expect(emitted).toHaveLength(1);
  });

  it('should show a neutral explanation and no action for a read-only viewer', async () => {
    await render([role({ id: 'role-1', isSystem: true, name: 'Owner' })], { canManage: false });

    const emptyState: HTMLElement | null = root().querySelector(
      '[data-slot="empty"]:not([role="alert"])',
    );

    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('This organization uses built-in roles only.');
    expect(emptyState?.querySelector('button')).toBeNull();
  });

  it('should draw skeleton cards while loading, and no data cards or sections', async () => {
    await render([role()], { loading: true });

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(cards()).toHaveLength(0);
    expect(root().querySelectorAll('section')).toHaveLength(0);
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
