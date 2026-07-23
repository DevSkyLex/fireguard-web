import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

/**
 * Pages hosted inside the workspace shell.
 *
 * The workspace mounts the very same `ORGANIZATION_SCOPED_ROUTES` objects the
 * dashboard tree mounts, so guards, resolvers, titles and breadcrumbs cannot
 * drift between the two shells. Both remain reachable: hosting is additive,
 * nothing was moved.
 */
test.describe('Workspace hosted pages', () => {
  const organization = organizationOutput();

  test('renders the account page inside the shell', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await page.goto(`/organizations/${organization.id}/workspace/account`);
    await workspace.shell.waitFor({ state: 'visible' });

    await expect(page.locator('app-account-page')).toBeVisible();
    // The shell chrome is still there — this is a hosted page, not a takeover.
    await expect(workspace.rail).toBeVisible();
    await expect(workspace.sidebar).toBeVisible();
  });

  test('replaces the dashboard title banner with the header trail', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await page.goto(`/organizations/${organization.id}/workspace/account`);
    await workspace.shell.waitFor({ state: 'visible' });

    const header = page.locator('app-workspace-layout-header');

    // Existing list pages have no in-page <h1> and relied on the dashboard
    // banner; the trail is what carries the page name here.
    await expect(header).toContainText(organization.name);
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
    await page.goto(`/organizations/${organization.id}/workspace/account`);
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

  test('keeps the dashboard route serving the same page', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    await page.goto('/account');

    await expect(page.locator('#dashboard-layout')).toBeVisible();
    await expect(page.locator('app-account-page')).toBeVisible();
    await expect(page.locator('#workspace-layout')).toHaveCount(0);
  });
});
