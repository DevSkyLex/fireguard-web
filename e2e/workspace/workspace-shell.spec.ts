import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

const ORGANIZATION_ID = 'e2e-org-1';

/**
 * Workspace shell — `/organizations/:organizationId/workspace`
 * (`WorkspaceLayout`, `src/app/layouts/workspace-layout`).
 *
 * Structural smoke coverage for the four-column collaboration shell mounted
 * alongside the untouched dashboard tree. The columns are deliberately empty
 * at this stage: rail, sidebar and panel contributions arrive with the
 * collaboration feature, so this suite asserts the frame, the responsive
 * behavior and the absence of a shell-level scroller.
 */
test.describe('Workspace shell', () => {
  test('renders the shell for an authenticated member', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION_ID);

    await expect(page).toHaveURL(`/organizations/${ORGANIZATION_ID}/workspace`);
    await expect(workspace.shell).toBeVisible();
    await expect(workspace.main).toBeAttached();
  });

  test('never scrolls the shell itself', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION_ID);

    // Every column owns its own scroller, so the frame must stay pinned to the
    // viewport — a scrolling shell would detach the composer from the thread.
    const overflow = await workspace.shell.evaluate(
      (element: HTMLElement) => getComputedStyle(element).overflow,
    );

    expect(overflow).toBe('hidden');

    const scrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
    );

    expect(scrolls).toBe(false);
  });

  test('shows the rail beside the sidebar on desktop', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await page.setViewportSize({ width: 1280, height: 900 });

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION_ID);

    await expect(workspace.rail).toBeVisible();
    await expect(workspace.sidebar).toBeVisible();

    const railWidth = await workspace.rail.evaluate(
      (element: HTMLElement) => element.getBoundingClientRect().width,
    );

    expect(railWidth).toBe(60);
  });

  test('hides the rail and shows a single pane below the desktop breakpoint', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await page.setViewportSize({ width: 900, height: 900 });

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION_ID);

    // Mobile opens on the `list` pane: the sidebar is visible, the main column
    // is not, and the rail is gone entirely.
    await expect(workspace.rail).toBeHidden();
    await expect(workspace.sidebar).toBeVisible();
    await expect(workspace.main).toBeHidden();
  });

  test('bypasses the rail and the sidebar with a skip link', async ({ page, browserName }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION_ID);

    const skip = page.getByTestId('workspace-skip-link');

    // WebKit omits links from the Tab order unless Full Keyboard Access is on,
    // so a bare Tab never lands on the skip link there. Focus it directly on
    // WebKit; keep the real "first Tab stop" assertion where the browser tabs
    // to links natively (Chromium, Firefox).
    if (browserName === 'webkit') {
      await skip.focus();
    } else {
      await page.keyboard.press('Tab');
    }
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    const before = page.url();
    await page.keyboard.press('Enter');

    // The document declares `<base href="/">`, so a bare `#workspace-main`
    // would resolve against the app root and navigate out of the workspace.
    await expect(page).toHaveURL(before);
    await expect(page.locator('#workspace-main')).toBeFocused();
  });

  test('leaves the dashboard shell untouched on its own routes', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto(`/organizations/${ORGANIZATION_ID}`);

    // The workspace route is an addition, not a replacement: sibling
    // organization URLs must still resolve to the dashboard layout.
    await expect(page.locator('#dashboard-layout')).toBeVisible();
    await expect(page.locator('#workspace-layout')).toHaveCount(0);
  });
});
