import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { channelOutput, inspectionsChannelOutput } from '../support/fixtures/channel-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

test('moves a channel by dragging, then detaches it with the keyboard menu', async ({ page }) => {
  const api = new ApiMock(page);
  const general = channelOutput({ isFavorite: false, unreadCount: 0 });
  const inspections = inspectionsChannelOutput();
  await api.mockAuthenticatedSession();
  await api.mockChannelList([general, inspections]);
  await api.mockChannelParent({ ...general, parent: '/api/channels/' + inspections.id });
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/channels');
  const source = page
    .getByTestId('channels-tree')
    .getByRole('link', { name: 'general', exact: true });
  await expect(source).toBeVisible();
  const box = await source.boundingBox();
  if (!box) throw new Error('The source channel must be visible.');
  await page.mouse.move(box.x + 60, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 40, { steps: 8 });
  await expect(page.getByTestId('channels-drop-root')).toBeVisible();
  const target = await page
    .getByTestId('channels-tree')
    .getByRole('link', { name: 'inspections', exact: true })
    .boundingBox();
  if (!target) throw new Error('The destination channel must be visible.');
  await page.mouse.move(target.x + 60, target.y + target.height / 2, { steps: 15 });
  await expect(
    page.getByText('Drop here to move inside this channel', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'e2e/artifacts/channel-drag-destination.png' });
  const move = page.waitForRequest(
    (request) => request.url().endsWith('/parent') && request.method() === 'PATCH',
  );
  await page.mouse.up();
  expect((await move).postDataJSON()).toEqual({ parentChannelId: inspections.id });
  await expect(page.getByTestId('channels-children-toggle')).toBeVisible();
  await expect(page.getByTestId('channels-tree').locator(':scope > li')).toHaveCount(1);
  await api.mockChannelList([
    { ...general, parent: '/api/channels/' + inspections.id },
    inspections,
  ]);
  await page.reload();
  await expect(page.getByTestId('channels-tree').locator(':scope > li')).toHaveCount(1);
  await api.mockChannelParent(general);
  await page.getByRole('button', { name: 'Move #general', exact: true }).focus();
  await page.keyboard.press('Enter');
  const root = page.getByRole('menuitem', { name: 'Top level', exact: true });
  await expect(root).toBeVisible();
  await root.focus();
  const detach = page.waitForRequest(
    (request) => request.url().endsWith('/parent') && request.method() === 'PATCH',
  );
  await page.keyboard.press('Enter');
  expect((await detach).postDataJSON()).toEqual({ parentChannelId: null });
  await expect(page.getByTestId('channels-tree').locator(':scope > li')).toHaveCount(2);
  await page.screenshot({ path: 'e2e/artifacts/channel-drag-result.png' });
});
