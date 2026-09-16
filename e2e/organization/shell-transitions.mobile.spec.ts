import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, notificationOutput } from '../support/fixtures/api-fixtures';
import { inspectionOutput } from '../support/fixtures/inspection-fixtures';
import { collectConsoleErrors } from '../support/helpers/appearance';
import { expectCriticalActionVisible } from '../support/helpers/critical-visibility';
import { captureInteractionMode, emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page, context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ notifications: [notificationOutput()], unreadCount: 1 });
  await api.mockInspectionList(E2E_ORGANIZATION_ID, [inspectionOutput()]);
  await api.mockAccountVisualReads();
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/inspections`);
  await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
  await expect(page.locator('#inspections')).toBeVisible();
});

test('closes notifications and quick actions when navigating to the notification centre', async ({
  page,
}, info) => {
  const errors = collectConsoleErrors(page);
  await page.getByRole('button', { name: 'Open quick actions' }).click();
  const parent = page.getByTestId('dashboard-mobile-actions-drawer');
  await parent.getByTestId('notification-bell-trigger').click();
  const child = page
    .getByRole('dialog', { name: 'Notifications', exact: true })
    .locator('[data-slot="drawer-content"]');
  await expect(child).toBeVisible();
  await expect(child.getByTestId('notification-bell-item')).toHaveAccessibleName(/^Unread /);
  const centre = child.getByRole('link', { name: 'Notification centre', exact: true });
  await expectCriticalActionVisible(centre);
  await captureInteractionMode(page, info, 'quick-actions-notifications');
  await centre.click();
  await expect(page).toHaveURL(/\/account\/notifications$/);
  await expect(child).toHaveCount(0);
  await expect(parent).toHaveCount(0);
  await expect(page.locator('#account-notifications')).toContainText(
    'An intervention was assigned to you',
  );
  await expectCriticalActionVisible(page.getByTestId('account-notifications-tab-inbox'));
  await captureInteractionMode(page, info, 'notification-centre-after-navigation');
  expect(errors).toEqual([]);
});

test('dismisses only the notification child on backdrop and preserves its parent focus', async ({
  page,
}, info) => {
  const trigger = page.getByRole('button', { name: 'Open quick actions' });
  await trigger.focus();
  await trigger.press('Enter');
  const parent = page.getByTestId('dashboard-mobile-actions-drawer');
  const bell = parent.getByTestId('notification-bell-trigger');
  await bell.focus();
  await bell.press('Enter');
  const child = page
    .getByRole('dialog', { name: 'Notifications', exact: true })
    .locator('[data-slot="drawer-content"]');
  await expect(child).toBeVisible();
  expect((await child.boundingBox())?.y).toBeGreaterThan(16);
  await page.mouse.click(8, 8);
  await expect(child).toHaveCount(0);
  await expect(parent).toBeVisible();
  await expect(bell).toBeFocused();
  await captureInteractionMode(page, info, 'child-backdrop-preserves-quick-actions');
  expect((await parent.boundingBox())?.y).toBeGreaterThan(16);
  await page.mouse.click(8, 8);
  await expect(parent).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(parent).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(parent).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('keeps explicit Close and a native downward pointer swipe available for quick actions', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Open quick actions' });
  const parent = page.getByTestId('dashboard-mobile-actions-drawer');
  await trigger.focus();
  await trigger.press('Enter');
  await parent.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(parent).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(parent).toBeVisible();
  // Installed BrnDrawerHandle refuses drag for its first 500ms (OPEN_TIME_COOLDOWN).
  const openedAt = Date.now();
  await expect.poll(() => Date.now() - openedAt, { intervals: [100] }).toBeGreaterThanOrEqual(500);
  const box = await parent.boundingBox();
  if (!box) throw new Error('Expected the native drawer pointer handle.');
  await page.mouse.move(box.x + box.width / 2, box.y + 18);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2, { steps: 12 });
  await page.mouse.up();
  await expect(parent).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

for (const shortcut of ['Control+k', 'Meta+k']) {
  for (const openParent of [false, true]) {
    test(`opens search with ${shortcut} while quick actions are ${openParent ? 'open' : 'unmounted'}`, async ({
      page,
    }, info) => {
      const parent = page.getByTestId('dashboard-mobile-actions-drawer');
      const trigger = page.getByRole('button', { name: 'Open quick actions' });
      await expect(parent).toHaveCount(0);
      await trigger.focus();
      if (openParent) {
        await trigger.press('Enter');
        await expect(parent).toBeVisible();
        await parent.getByRole('button', { name: 'Search this organization' }).focus();
      }
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
      await page.keyboard.press(shortcut);
      const search = page.getByTestId('global-search-palette');
      await expect(search).toBeVisible();
      await expect(parent).toHaveCount(0);
      await expect
        .poll(() => search.evaluate((element) => element.contains(document.activeElement)))
        .toBe(true);
      expect(
        await transition.evaluate((probe) => {
          probe.stop();
          return probe.state.overlapped;
        }),
        'Parent closure must commit before Search opens.',
      ).toBe(false);
      await transition.dispose();
      await captureInteractionMode(
        page,
        info,
        `search-${openParent ? 'open' : 'closed'}-parent-${shortcut.replace('+', '-')}`,
      );
      await page.keyboard.press('Escape');
      await expect(search).toHaveCount(0);
      await expect(parent).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  }
}
