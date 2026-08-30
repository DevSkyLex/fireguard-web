import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { OrganizationMemberOutput } from '@features/organization/models';
import { OrganizationMemberTable } from '../organization-member-table.component';

const DEFAULT_SORT_ORDER = { field: 'joinedAt' as const, direction: 'asc' as const };

function member(overrides: Partial<OrganizationMemberOutput> = {}): OrganizationMemberOutput {
  return {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Doe',
    displayName: undefined,
    avatarUrl: null,
    isActive: true,
    isOwner: false,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    roleNames: [],
    ...overrides,
  } as unknown as OrganizationMemberOutput;
}

describe('OrganizationMemberTable', () => {
  let fixture: ComponentFixture<OrganizationMemberTable>;
  let selectionChanges: ReadonlySet<string>[];
  let manageRolesRequests: OrganizationMemberOutput[];
  let removeRequests: OrganizationMemberOutput[];
  let reactivateRequests: OrganizationMemberOutput[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function createTable(items: readonly OrganizationMemberOutput[] = []): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(OrganizationMemberTable);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'members']);
    fixture.componentRef.setInput('sortOrder', DEFAULT_SORT_ORDER);
    await fixture.whenStable();

    selectionChanges = [];
    manageRolesRequests = [];
    removeRequests = [];
    reactivateRequests = [];
    fixture.componentInstance.selectionChanged.subscribe((ids) => selectionChanges.push(ids));
    fixture.componentInstance.manageRolesRequested.subscribe((target) =>
      manageRolesRequests.push(target),
    );
    fixture.componentInstance.removeRequested.subscribe((target) => removeRequests.push(target));
    fixture.componentInstance.reactivateRequested.subscribe((target) =>
      reactivateRequests.push(target),
    );
  }

  /** Opens a row's `…` menu and returns its overlay content, rendered outside `fixture.nativeElement`. */
  async function openRowMenu(): Promise<HTMLElement> {
    root()
      .querySelector('[data-testid="organization-member-table-row-menu"]')
      ?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    return document.body;
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('accessibility', () => {
    it('should name the scrolling region from the table caption', async () => {
      await createTable([member({ id: 'a' })]);

      const region: HTMLElement | null = root().querySelector('[role="region"]');
      const caption: HTMLElement | null = root().querySelector('caption');

      expect(region?.getAttribute('aria-labelledby')).toBe(caption?.id);
      expect(caption?.id).toBeTruthy();
    });
  });

  describe('rows', () => {
    it('should render one row per item, addressed by the canonical row testid', async () => {
      await createTable([member({ id: 'a' }), member({ id: 'b' })]);

      expect(root().querySelectorAll('[data-testid="organization-member-table-row"]')).toHaveLength(
        2,
      );
    });

    it('should link the row to the member detail route built from detailRouteBase and the id', async () => {
      await createTable([member({ id: 'm-42', displayName: 'Alice Doe' })]);

      const anchor: HTMLAnchorElement | null = root().querySelector(
        '[data-testid="organization-member-table-row"] a',
      );

      expect(anchor?.getAttribute('href')).toBe('/organizations/org-1/members/m-42');
      expect(anchor?.textContent).toContain('Alice Doe');
    });
  });

  describe('selection column', () => {
    it('should render neither the header nor any row checkbox without canRemove', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentRef.setInput('canRemove', false);
      await fixture.whenStable();

      expect(
        root().querySelector('[data-testid="organization-member-table-select-all"]'),
      ).toBeNull();
      expect(
        root().querySelector('[data-testid="organization-member-table-row-select"]'),
      ).toBeNull();
    });

    it('should render the header and row checkboxes once canRemove is granted', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      expect(
        root().querySelector('[data-testid="organization-member-table-select-all"]'),
      ).not.toBeNull();
      expect(
        root().querySelector('[data-testid="organization-member-table-row-select"]'),
      ).not.toBeNull();
    });

    it('should emit the full next selection, preserving ids outside the current page, when the header checkbox is toggled on', async () => {
      await createTable([member({ id: 'a' }), member({ id: 'b' })]);
      fixture.componentRef.setInput('canRemove', true);
      fixture.componentRef.setInput('selectedIds', new Set(['off-page']));
      await fixture.whenStable();

      root()
        .querySelector<HTMLButtonElement>(
          '[data-testid="organization-member-table-select-all"] button',
        )
        ?.click();
      await fixture.whenStable();

      expect(selectionChanges).toHaveLength(1);
      expect([...(selectionChanges[0] ?? [])].toSorted()).toEqual(
        ['a', 'b', 'off-page'].toSorted(),
      );
    });

    it('should emit the selection with only the toggled row removed when a row checkbox is toggled off', async () => {
      await createTable([member({ id: 'a' }), member({ id: 'b' })]);
      fixture.componentRef.setInput('canRemove', true);
      fixture.componentRef.setInput('selectedIds', new Set(['a', 'b']));
      await fixture.whenStable();

      root()
        .querySelector<HTMLButtonElement>(
          '[data-testid="organization-member-table-row-select"] button',
        )
        ?.click();
      await fixture.whenStable();

      expect([...(selectionChanges[0] ?? [])]).toEqual(['b']);
    });

    it('should mark the header checkbox checked once every rendered row is selected', async () => {
      await createTable([member({ id: 'a' }), member({ id: 'b' })]);
      fixture.componentRef.setInput('canRemove', true);
      fixture.componentRef.setInput('selectedIds', new Set(['a', 'b']));
      await fixture.whenStable();

      const headerCheckbox: Element | null = root().querySelector(
        '[data-testid="organization-member-table-select-all"] [role="checkbox"]',
      );

      expect(headerCheckbox?.getAttribute('aria-checked')).toBe('true');
    });

    it('should mark the header checkbox indeterminate once some but not all rendered rows are selected', async () => {
      await createTable([member({ id: 'a' }), member({ id: 'b' })]);
      fixture.componentRef.setInput('canRemove', true);
      fixture.componentRef.setInput('selectedIds', new Set(['a']));
      await fixture.whenStable();

      const headerCheckbox: Element | null = root().querySelector(
        '[data-testid="organization-member-table-select-all"] [role="checkbox"]',
      );

      expect(headerCheckbox?.getAttribute('aria-checked')).toBe('mixed');
    });

    it('should leave the header checkbox unchecked and non-indeterminate on a first load, before any row exists', async () => {
      await createTable([]);
      fixture.componentRef.setInput('canRemove', true);
      fixture.componentRef.setInput('loading', true);
      await fixture.whenStable();

      const headerCheckbox: Element | null = root().querySelector(
        '[data-testid="organization-member-table-select-all"] [role="checkbox"]',
      );

      expect(headerCheckbox?.getAttribute('aria-checked')).toBe('false');
    });

    it('should render no header checkbox at all once the surface has swapped the table for its empty slot', async () => {
      await createTable([]);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      expect(
        root().querySelector('[data-testid="organization-member-table-select-all"]'),
      ).toBeNull();
    });
  });

  describe('loading', () => {
    it('should draw only skeleton rows, marked aria-hidden, while loading with no items yet', async () => {
      await createTable([]);
      fixture.componentRef.setInput('loading', true);
      await fixture.whenStable();

      const skeletonRows: readonly Element[] = [...root().querySelectorAll('tbody tr')];

      expect(root().querySelectorAll('[data-testid="organization-member-table-row"]')).toHaveLength(
        0,
      );
      expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
      expect(skeletonRows.length).toBeGreaterThan(0);
      expect(skeletonRows.every((row) => row.getAttribute('aria-hidden') === 'true')).toBe(true);
    });

    it('should draw the real rows, not skeletons, once items have arrived even while loading stays true', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentRef.setInput('loading', true);
      await fixture.whenStable();

      expect(root().querySelectorAll('[data-testid="organization-member-table-row"]')).toHaveLength(
        1,
      );
      expect(root().querySelectorAll('hlm-skeleton')).toHaveLength(0);
    });

    it('should render a leading skeleton checkbox cell only when canRemove is granted', async () => {
      await createTable([]);
      fixture.componentRef.setInput('loading', true);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      const firstRowCells: number =
        root().querySelector('tbody tr')?.querySelectorAll('td').length ?? 0;

      expect(firstRowCells).toBe(7);
    });
  });

  describe('cards', () => {
    it('should render the same member a second time as a card, under the row testid plus -card', async () => {
      await createTable([member({ id: 'a' }), member({ id: 'b' })]);

      // Both layouts stay mounted — a container query, not an `@if`, picks the
      // visible one — so the card is a second render of the same row, never a
      // duplicate to assert row counts against.
      expect(
        root().querySelectorAll('[data-testid="organization-member-table-row-card"]'),
      ).toHaveLength(2);
      expect(root().querySelectorAll('[data-testid="organization-member-table-row"]')).toHaveLength(
        2,
      );
    });
  });

  describe('empty', () => {
    it('should replace the table with a plain message once loaded with no members', async () => {
      await createTable([]);
      fixture.componentRef.setInput('canRemove', false);
      await fixture.whenStable();

      expect(root().textContent).toContain('No results.');
      expect(root().querySelector('[data-testid="organization-member-table"]')).toBeNull();
    });

    it('should say the same with the checkbox column granted', async () => {
      await createTable([]);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      expect(root().textContent).toContain('No results.');
      expect(root().querySelector('[data-testid="organization-member-table"]')).toBeNull();
    });

    it('should never render the empty message while loading', async () => {
      await createTable([]);
      fixture.componentRef.setInput('loading', true);
      await fixture.whenStable();

      expect(root().textContent).not.toContain('No results.');
    });
  });

  describe('sorting', () => {
    let sortChanges: string[];

    beforeEach(() => {
      sortChanges = [];
    });

    it('should announce the active field ascending and mark the other head none', async () => {
      await createTable([member({ id: 'a' })]);

      const memberHead: HTMLElement | null = root()
        .querySelector('[data-testid="organization-member-table-sort-member"]')
        ?.closest('th') as HTMLElement | null;
      const joinedHead: HTMLElement | null = root()
        .querySelector('[data-testid="organization-member-table-sort-joined"]')
        ?.closest('th') as HTMLElement | null;

      expect(joinedHead?.getAttribute('aria-sort')).toBe('ascending');
      expect(memberHead?.getAttribute('aria-sort')).toBe('none');
    });

    it('should announce descending once the active direction is desc', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentRef.setInput('sortOrder', { field: 'joinedAt', direction: 'desc' });
      await fixture.whenStable();

      const joinedHead: HTMLElement | null = root()
        .querySelector('[data-testid="organization-member-table-sort-joined"]')
        ?.closest('th') as HTMLElement | null;

      expect(joinedHead?.getAttribute('aria-sort')).toBe('descending');
    });

    it('should emit sortChanged with the clicked head field', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentInstance.sortChanged.subscribe((field) => sortChanges.push(field));

      root()
        .querySelector<HTMLButtonElement>('[data-testid="organization-member-table-sort-member"]')
        ?.click();
      await fixture.whenStable();

      expect(sortChanges).toEqual(['displayName']);
    });
  });

  describe('row menu', () => {
    it('should render no menu trigger without either permission', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentRef.setInput('canRemove', false);
      fixture.componentRef.setInput('canAssignRoles', false);
      await fixture.whenStable();

      expect(root().querySelector('[data-testid="organization-member-table-row-menu"]')).toBeNull();
    });

    it('should offer only Assign roles to a member holding canAssignRoles but not canRemove', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentRef.setInput('canRemove', false);
      fixture.componentRef.setInput('canAssignRoles', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();

      expect(
        overlay.querySelector('[data-testid="organization-member-table-row-roles"]'),
      ).not.toBeNull();
      expect(
        overlay.querySelector('[data-testid="organization-member-table-row-remove"]'),
      ).toBeNull();
    });

    it('should offer only Remove to a member holding canRemove but not canAssignRoles', async () => {
      await createTable([member({ id: 'a' })]);
      fixture.componentRef.setInput('canRemove', true);
      fixture.componentRef.setInput('canAssignRoles', false);
      await fixture.whenStable();

      const overlay = await openRowMenu();

      expect(
        overlay.querySelector('[data-testid="organization-member-table-row-roles"]'),
      ).toBeNull();
      expect(
        overlay.querySelector('[data-testid="organization-member-table-row-remove"]'),
      ).not.toBeNull();
    });

    it('should emit manageRolesRequested with the row’s raw member on Assign roles', async () => {
      const target = member({ id: 'target' });
      await createTable([target]);
      fixture.componentRef.setInput('canAssignRoles', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();
      (
        overlay.querySelector(
          '[data-testid="organization-member-table-row-roles"]',
        ) as HTMLButtonElement | null
      )?.click();
      await fixture.whenStable();

      expect(manageRolesRequests).toEqual([target]);
    });

    it('should not offer Reactivate for an active member even with canRemove granted', async () => {
      await createTable([member({ id: 'a', isActive: true })]);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();

      expect(
        overlay.querySelector('[data-testid="organization-member-table-row-reactivate"]'),
      ).toBeNull();
    });

    it('should not offer Reactivate for an inactive member without canRemove', async () => {
      await createTable([member({ id: 'a', isActive: false })]);
      fixture.componentRef.setInput('canRemove', false);
      fixture.componentRef.setInput('canAssignRoles', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();

      expect(
        overlay.querySelector('[data-testid="organization-member-table-row-reactivate"]'),
      ).toBeNull();
    });

    it('should offer Reactivate for an inactive member holding canRemove', async () => {
      await createTable([member({ id: 'a', isActive: false })]);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();

      expect(
        overlay.querySelector('[data-testid="organization-member-table-row-reactivate"]'),
      ).not.toBeNull();
    });

    it('should emit reactivateRequested with the row’s raw member on Reactivate', async () => {
      const target = member({ id: 'target', isActive: false });
      await createTable([target]);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();
      (
        overlay.querySelector(
          '[data-testid="organization-member-table-row-reactivate"]',
        ) as HTMLButtonElement | null
      )?.click();
      await fixture.whenStable();

      expect(reactivateRequests).toEqual([target]);
    });

    it('should disable Reactivate while pending', async () => {
      await createTable([member({ id: 'a', isActive: false })]);
      fixture.componentRef.setInput('canRemove', true);
      fixture.componentRef.setInput('pending', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();
      const reactivateButton = overlay.querySelector<HTMLButtonElement>(
        '[data-testid="organization-member-table-row-reactivate"]',
      );

      expect(reactivateButton?.disabled).toBe(true);
    });

    it('should emit removeRequested with the row’s raw member on Remove, without removing it itself', async () => {
      const target = member({ id: 'target' });
      await createTable([target]);
      fixture.componentRef.setInput('canRemove', true);
      await fixture.whenStable();

      const overlay = await openRowMenu();
      (
        overlay.querySelector(
          '[data-testid="organization-member-table-row-remove"]',
        ) as HTMLButtonElement | null
      )?.click();
      await fixture.whenStable();

      expect(removeRequests).toEqual([target]);
      expect(root().querySelectorAll('[data-testid="organization-member-table-row"]')).toHaveLength(
        1,
      );
    });
  });
});
