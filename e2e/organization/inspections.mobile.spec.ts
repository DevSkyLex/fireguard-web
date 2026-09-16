import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { inspectionOutput } from '../support/fixtures/inspection-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { expectCriticalActionVisible } from '../support/helpers/critical-visibility';
import { captureInteractionMode, emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { InspectionsPage } from '../support/pages/inspections.page';

test.use({ viewport: { width: 375, height: 800 } });
test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test('uses mobile quick actions and closes their drawer before opening search', async ({
  page,
  context,
  baseURL,
}, info) => {
  const consoleErrors = collectConsoleErrors(page);
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');

  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInspectionList(E2E_ORGANIZATION_ID, [inspectionOutput()]);
  const inspections = new InspectionsPage(page);

  await inspections.gotoList(E2E_ORGANIZATION_ID);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(inspections.listRoot).toBeVisible();

  await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
  await expect(page.locator('#organization-mobile-navigation')).toBeVisible();
  await expect(page.getByTestId('dashboard-sidebar-trigger')).toHaveCount(0);
  const mobileActionsTrigger = page.getByRole('button', { name: 'Open quick actions' });
  await expectCriticalActionVisible(mobileActionsTrigger);
  await expect(page.getByTestId('dashboard-desktop-actions')).toHaveCount(0);

  const toolbarBox = await page.getByTestId('collection-toolbar').boundingBox();
  const searchBox = await page.getByTestId('inspections-search-group').boundingBox();
  const filtersBox = await inspections.filtersToggle.boundingBox();

  expect(toolbarBox).not.toBeNull();
  expect(searchBox).not.toBeNull();
  expect(filtersBox).not.toBeNull();
  expect(searchBox?.width).toBeCloseTo(toolbarBox?.width ?? 0, 0);
  expect(filtersBox?.y ?? 0).toBeGreaterThanOrEqual((searchBox?.y ?? 0) + (searchBox?.height ?? 0));

  await expectNoHorizontalOverflow(page);
  await captureInteractionMode(page, info, 'inspections-list-dark-phone');

  await mobileActionsTrigger.focus();
  await mobileActionsTrigger.press('Enter');
  const mobileActionsDrawer = page.getByTestId('dashboard-mobile-actions-drawer');
  const mobileActions = page.getByTestId('dashboard-mobile-actions');
  const globalSearch = mobileActions.getByRole('button', { name: 'Search this organization' });
  const actionButtons = mobileActions.getByRole('button');

  await expect(mobileActionsDrawer).toBeVisible();
  await expect(mobileActionsDrawer.getByRole('heading', { name: 'Quick actions' })).toBeVisible();
  await expect(mobileActions).toHaveAttribute('data-slot', 'item-group');
  expect(
    await mobileActionsDrawer
      .getByRole('heading', { name: 'Quick actions', exact: true })
      .evaluate((element) => getComputedStyle(element).textAlign),
  ).toBe('start');
  await expect(globalSearch).toBeVisible();
  await expect(globalSearch.getByText('Search this organization', { exact: true })).toBeVisible();
  await expect(mobileActions.getByTestId('notification-bell-trigger')).toBeVisible();
  await expect(mobileActions.getByText('Notifications', { exact: true })).toBeVisible();
  const syncStatus = mobileActions.getByTestId('intervention-sync-status');
  await expect(syncStatus).toBeVisible();
  await expect(syncStatus.getByText('Up to date', { exact: true })).toBeVisible();
  await expect(mobileActions.getByText('Assistant', { exact: true })).toBeVisible();
  await expect(mobileActions.getByText(/^Appearance:/)).toBeVisible();
  await expect(mobileActions.getByRole('button', { name: /^Appearance:/ })).toBeVisible();
  await expect(actionButtons).toHaveCount(5);
  await Promise.all(
    (await actionButtons.all()).map((button) => expectCriticalActionVisible(button)),
  );
  const actionButtonBoxes = await actionButtons.evaluateAll((buttons) =>
    buttons.map((button, index) => {
      const box = button.getBoundingClientRect();

      return {
        index,
        name: button.getAttribute('aria-label') ?? button.textContent?.trim(),
        text: button.textContent?.replace(/\s+/g, ' ').trim(),
        testId: button.getAttribute('data-testid'),
        classes: button.className,
        height: box.height,
        width: box.width,
        x: box.x,
        y: box.y,
      };
    }),
  );
  await info.attach('quick-action-bounds', {
    body: JSON.stringify(actionButtonBoxes, null, 2),
    contentType: 'application/json',
  });
  expect(actionButtonBoxes).toHaveLength(5);
  let previousY = Number.NEGATIVE_INFINITY;
  for (const box of actionButtonBoxes) {
    expect(box.height, `${box.name}: target height`).toBeGreaterThanOrEqual(44);
    expect(box.width, `${box.name}: full row width`).toBeGreaterThan(300);
    expect(box.y, `${box.name}: next row`).toBeGreaterThan(previousY);
    previousY = box.y;
  }
  await captureInteractionMode(page, info, 'inspections-quick-actions-drawer-dark-mobile');

  const transition = await page.evaluateHandle(() => {
    const state = { overlapped: false };
    const observer = new MutationObserver(() => {
      const first = document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]');
      const next = document.querySelector('[data-testid="global-search-palette"]');
      if (
        first &&
        next &&
        first.getBoundingClientRect().height > 0 &&
        next.getBoundingClientRect().height > 0
      )
        state.overlapped = true;
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return { state, stop: () => observer.disconnect() };
  });
  await globalSearch.click();
  const search = page.getByTestId('global-search-palette');
  await expect(search).toBeVisible();
  await expect(mobileActionsDrawer).toHaveCount(0);
  await expect
    .poll(() => search.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  expect(
    await transition.evaluate((probe) => {
      probe.stop();
      return probe.state.overlapped;
    }),
    'The first drawer must finish closing before the search surface opens.',
  ).toBe(false);
  await transition.dispose();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('global-search-palette')).toHaveCount(0);
  await expect(mobileActionsDrawer).toHaveCount(0);
  await expect(mobileActionsTrigger).toBeFocused();
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
