import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

/**
 * Pages hosted inside the workspace shell.
 *
 * The shell serves every authenticated destination — organization pages,
 * conversations and the account pages — so a route's own guards, resolvers,
 * titles and breadcrumbs are the only thing that varies between them.
 */
test.describe('Workspace hosted pages', () => {
  const organization = organizationOutput();

  test('renders the account page inside the shell', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await page.goto('/account');
    await workspace.shell.waitFor({ state: 'visible' });

    await expect(page.locator('app-account-page')).toBeVisible();
    // The shell chrome is still there — this is a hosted page, not a takeover.
    await expect(workspace.sidebar).toBeVisible();
  });

  test('carries the page name in the header trail', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await page.goto('/account');
    await workspace.shell.waitFor({ state: 'visible' });

    const header = page.locator('app-workspace-layout-header');

    // List pages with no in-page <h1> depend on the trail for their name.
    await expect(header).toContainText('Account');

    const height = await header.evaluate((el: HTMLElement) =>
      Math.round(el.getBoundingClientRect().height),
    );

    expect(height).toBe(56);
  });

  test('scrolls a hosted page without scrolling the shell', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await page.goto('/account');
    await workspace.shell.waitFor({ state: 'visible' });

    // The shell stays pinned to the viewport; the page scrolls inside it.
    const shellScrolls = await workspace.shell.evaluate(
      (el: HTMLElement) => el.scrollHeight > el.clientHeight,
    );

    expect(shellScrolls).toBe(false);

    const documentScrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
    );

    expect(documentScrolls).toBe(false);
  });
});
