import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

const ORGANIZATION = organizationOutput();

interface ChannelRow {
  readonly id: string;
  readonly name: string;
  readonly parent?: string;
  readonly unreadCount?: number;
  readonly isFavorite?: boolean;
}

/**
 * Mocks `GET /api/channels`.
 *
 * `@id` is a Skolem genid on purpose: the backend re-normalizes this DTO
 * through the anonymous JSON-LD path and mints a fresh one on every response,
 * so anything keying rows off it would break here.
 */
async function mockChannels(page: Page, rows: readonly ChannelRow[]): Promise<void> {
  await page.route(/\/api\/channels(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/channels',
        '@type': 'Collection',
        totalItems: rows.length,
        member: rows.map((row: ChannelRow) => ({
          '@id': `/.well-known/genid/${Math.random().toString(16).slice(2)}`,
          '@type': 'ChannelOutput',
          id: row.id,
          organization: `/api/organizations/${ORGANIZATION.id}`,
          name: row.name,
          participantCount: 3,
          isArchived: false,
          messagesCount: 12,
          unreadCount: row.unreadCount ?? 0,
          createdAt: '2026-01-01T00:00:00+00:00',
          updatedAt: '2026-01-01T00:00:00+00:00',
          isFavorite: row.isFavorite ?? false,
          ...(row.parent ? { parent: row.parent } : {}),
        })),
      }),
    });
  });
}

/**
 * Channel sections of the workspace sidebar, fed by `ChannelsStore`.
 */
test.describe('Workspace channels', () => {
  test('lists channels with their unread counts', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [
      { id: 'c1', name: 'Bâtiment Nord', unreadCount: 3 },
      { id: 'c4', name: 'Atelier Lyon' },
    ]);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    const nav = page.locator('app-collaboration-channel-nav');

    await expect(nav.getByRole('link', { name: /Bâtiment Nord/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Bâtiment Nord/ })).toContainText('3');
    await expect(nav.getByRole('link', { name: 'Atelier Lyon' })).toBeVisible();
  });

  test('indents a child channel under its parent', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [
      { id: 'c1', name: 'Bâtiment Nord' },
      { id: 'c2', name: 'Extincteurs', parent: '/api/channels/c1' },
    ]);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    const nav = page.locator('app-collaboration-channel-nav');
    const parentLeft = await nav
      .getByRole('link', { name: 'Bâtiment Nord' })
      .evaluate((el: HTMLElement) => Math.round(el.getBoundingClientRect().left));
    const childLeft = await nav
      .getByRole('link', { name: 'Extincteurs' })
      .evaluate((el: HTMLElement) => Math.round(el.getBoundingClientRect().left));

    // Nesting is derived from the `parent` IRI already on every row — no extra
    // request — and the child sits behind the hairline guide.
    expect(childLeft).toBeGreaterThan(parentLeft);
  });

  test('surfaces a favorited channel in its own section', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [
      { id: 'c1', name: 'Bâtiment Nord', isFavorite: true },
      { id: 'c4', name: 'Atelier Lyon' },
    ]);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    await expect(page.getByTestId('channel-nav-favorites-toggle')).toBeVisible();
    // A favorite is a shortcut, not a move: the channel keeps its place in the
    // hierarchy below, so it appears in both sections.
    await expect(
      page.locator('app-collaboration-channel-nav').getByRole('link', { name: 'Bâtiment Nord' }),
    ).toHaveCount(2);
  });

  test('collapses a section without losing the other', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [{ id: 'c1', name: 'Bâtiment Nord' }]);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    const toggle = page.getByTestId('channel-nav-channels-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(
      page.locator('app-collaboration-channel-nav').getByRole('link', { name: 'Bâtiment Nord' }),
    ).toHaveCount(0);
  });

  test('opens a channel conversation inside the shell', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [{ id: 'c1', name: 'Bâtiment Nord' }]);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    await page
      .locator('app-collaboration-channel-nav')
      .getByRole('link', { name: 'Bâtiment Nord' })
      .click();

    await expect(page).toHaveURL(`/organizations/${ORGANIZATION.id}/workspace/channels/c1`);
    await expect(workspace.shell).toBeVisible();
    await expect(page.getByTestId('channel-conversation')).toBeVisible();
  });

  test('switches the mobile viewport to the conversation when a channel is opened', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [{ id: 'c1', name: 'Bâtiment Nord' }]);
    await page.setViewportSize({ width: 900, height: 900 });

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    // Below the desktop breakpoint the two columns are stacked panes, so
    // navigating without switching pane leaves the member staring at the list
    // they just tapped — the conversation is `display:none` and out of the tab
    // order entirely.
    await expect(workspace.main).toBeHidden();

    await page
      .locator('app-collaboration-channel-nav')
      .getByRole('link', { name: 'Bâtiment Nord' })
      .click();

    await expect(workspace.main).toBeVisible();
    await expect(page.getByTestId('channel-conversation')).toBeVisible();
    await expect(workspace.sidebar).toBeHidden();
  });

  test('opens the conversation pane straight away on a mobile deep link', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [{ id: 'c1', name: 'Bâtiment Nord' }]);
    await page.setViewportSize({ width: 900, height: 900 });

    await page.goto(`/organizations/${ORGANIZATION.id}/workspace/channels/c1`);

    const workspace = new WorkspacePage(page);
    await expect(workspace.main).toBeVisible();
  });

  test('returns to the channel list from the conversation header', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [{ id: 'c1', name: 'Bâtiment Nord' }]);
    await page.setViewportSize({ width: 900, height: 900 });

    await page.goto(`/organizations/${ORGANIZATION.id}/workspace/channels/c1`);

    const workspace = new WorkspacePage(page);
    await expect(workspace.main).toBeVisible();

    await page.getByTestId('workspace-header-back').click();

    await expect(workspace.sidebar).toBeVisible();
    await expect(workspace.main).toBeHidden();
  });

  test('reopens the conversation when the same channel is tapped again', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [{ id: 'c1', name: 'Bâtiment Nord' }]);
    await page.setViewportSize({ width: 900, height: 900 });

    await page.goto(`/organizations/${ORGANIZATION.id}/workspace/channels/c1`);

    const workspace = new WorkspacePage(page);
    await expect(workspace.main).toBeVisible();

    // The back button changes the pane without changing the URL, so tapping the
    // channel again is a same-URL navigation the router *ignores* — it emits
    // NavigationSkipped, not NavigationEnd.
    await page.getByTestId('workspace-header-back').click();
    await expect(workspace.main).toBeHidden();

    await page
      .locator('app-collaboration-channel-nav')
      .getByRole('link', { name: 'Bâtiment Nord' })
      .click();

    await expect(workspace.main).toBeVisible();
  });

  test('opens the overview pane from the sidebar even though its path is empty', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, [{ id: 'c1', name: 'Bâtiment Nord' }]);
    await page.setViewportSize({ width: 900, height: 900 });

    await page.goto(`/organizations/${ORGANIZATION.id}/workspace/channels/c1`);

    const workspace = new WorkspacePage(page);
    await page.getByTestId('workspace-header-back').click();
    await expect(workspace.sidebar).toBeVisible();

    // The organization overview is mounted at `path: ''`, so a URL-shape rule
    // alone classifies it as "the bare workspace URL" and leaves the member on
    // the list while the page renders into a hidden column.
    await page
      .locator('app-organization-workspace-nav')
      .getByRole('link', { name: 'Dashboard' })
      .click();

    await expect(page).toHaveURL(`/organizations/${ORGANIZATION.id}/workspace`);
    await expect(workspace.main).toBeVisible();
  });

  test('shows an empty state when the organization has no channel', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannels(page, []);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    await expect(page.locator('app-collaboration-channel-nav')).toContainText('No channels yet.');
  });
});
