import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { channelOutput, inspectionsChannelOutput } from '../support/fixtures/channel-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

test('moves a channel from the touch menu while keeping the mobile list usable', async ({
  page,
}) => {
  const api = new ApiMock(page);
  const general = channelOutput({ isFavorite: false, unreadCount: 0 });
  const inspections = inspectionsChannelOutput();
  await api.mockAuthenticatedSession();
  await api.mockChannelList([general, inspections]);
  await api.mockChannelParent({ ...general, parent: '/api/channels/' + inspections.id });
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/channels');
  await page.getByRole('button', { name: 'Move #general', exact: true }).tap();
  await expect(page.getByRole('menuitem', { name: 'inspections', exact: true })).toBeVisible();
  await page.screenshot({
    path: 'e2e/artifacts/channel-move-mobile-menu.png',
    animations: 'disabled',
  });
  const request = page.waitForRequest(
    (item) => item.url().endsWith('/parent') && item.method() === 'PATCH',
  );
  await page.getByRole('menuitem', { name: 'inspections', exact: true }).tap();
  expect((await request).postDataJSON()).toEqual({ parentChannelId: inspections.id });
  await expect(page.getByTestId('channels-tree').locator(':scope > li')).toHaveCount(1);
  await expect(page.getByTestId('channels-children-toggle')).toBeVisible();
});
