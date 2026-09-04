import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';

test('messages extension stays beside the collapsible navigation and supports search, compose and route exit', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockMessagesWorkspace(page, 16);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages`);
  const extension = page.locator('#dashboard-sidebar-extension');
  const main = page.locator('#dashboard-main');
  const rows = page.getByTestId('direct-messages-panel-row');
  await expect(rows).toHaveCount(16);
  await expect(extension).toBeVisible();
  await expect(main).toBeVisible();
  await expect(rows.first().getByLabel('3 unread')).toBeVisible();
  const expanded = await extension.boundingBox();
  if (!expanded) throw new Error('The extension must have a desktop box.');
  await main.getByRole('button', { name: 'Toggle sidebar', exact: true }).click();
  await expect.poll(async () => (await extension.boundingBox())?.x).toBeLessThan(expanded.x);
  await expect(extension).toBeVisible();
  await main.getByRole('button', { name: 'Toggle sidebar', exact: true }).click();
  await expect.poll(async () => (await extension.boundingBox())?.x).toBe(expanded.x);
  const title = extension.getByRole('heading', { name: 'Messages' });
  const titleTop = (await title.boundingBox())?.y;
  expect(titleTop).toBeDefined();
  await rows.last().scrollIntoViewIfNeeded();
  expect((await title.boundingBox())?.y).toBe(titleTop);
  const search = extension.getByRole('searchbox');
  await search.fill('INES');
  await expect(rows).toHaveCount(1);
  await search.fill('nobody');
  await expect(extension.getByText('No matching conversations.')).toBeVisible();
  await search.fill('');
  await rows.first().click();
  await expect(page.getByTestId('direct-conversation-name')).toHaveText('Ines Pector');
  await expect(rows.first()).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('message-composer-input').fill('The report is ready for review.');
  await page.getByTestId('message-composer-send').click();
  await expect(
    page.getByTestId('message-thread').getByText('The report is ready for review.'),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(extension);
  await expectNoInternalOverflow(main);
  await page.screenshot({
    path: 'e2e/artifacts/messages-extension-desktop-light.png',
    animations: 'disabled',
  });
  await page.getByTestId('direct-messages-panel-new').click();
  await expect(page.getByTestId('direct-message-picker')).toBeVisible();
  await page.getByTestId('new-direct-message-search').fill('Ines');
  await page.getByTestId('new-direct-message-candidate').click();
  await expect(page.getByTestId('direct-message-picker')).toBeHidden();
  await page.getByRole('link', { name: 'Collaboration', exact: true }).click();
  await expect(extension).toBeVisible();
  await expect(page.getByTestId('channels-list')).toBeVisible();
  await expect(page.getByTestId('direct-messages-panel-row')).toHaveCount(0);
  await expect(main).toBeVisible();
  await expect(page.getByTestId('direct-messages-nav-link')).toBeVisible();
  expect(errors).toEqual([]);
});

test('messages extension renders a dark desktop deep link without horizontal overflow', async ({
  page,
  context,
  baseURL,
}) => {
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await mockMessagesWorkspace(page, 8);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages/e2e-direct-2`);
  await expect(page.getByTestId('direct-conversation-name')).toHaveText('Ines Pector');
  await expect(page.locator('#dashboard-sidebar-extension')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(page.locator('#dashboard-main'));
  await page.screenshot({
    path: 'e2e/artifacts/messages-extension-desktop-dark.png',
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});

test('tablet alternates list and thread while preserving primary navigation', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await mockMessagesWorkspace(page);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages`);
  await expect(page.locator('#dashboard-main')).toBeHidden();
  await expect(page.getByTestId('direct-messages-nav-link')).toBeVisible();
  await page.getByTestId('direct-messages-panel-row').first().click();
  await expect(page.locator('#dashboard-sidebar-extension')).toBeHidden();
  await expect(page.getByTestId('direct-conversation-back')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByTestId('direct-conversation-back').click();
  await expect(page.locator('#dashboard-sidebar-extension')).toBeVisible();
  await expect(page.locator('#dashboard-main')).toBeHidden();
});
