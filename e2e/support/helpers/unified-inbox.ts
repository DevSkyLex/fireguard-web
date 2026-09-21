import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../fixtures/api-fixtures';
import { channelOutput, E2E_CHANNEL_ID } from '../fixtures/channel-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow } from './appearance';

/** Verifies partial-source recovery, cursor pagination and source-owned read actions. */
export async function verifyUnifiedInbox(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ unreadCount: 3 });
  await api.mockChannelList([channelOutput()]);
  await api.mockChannelDetail(channelOutput());
  await api.mockChannelParticipants(E2E_CHANNEL_ID, []);
  await api.mockChannelMessages(E2E_CHANNEL_ID);
  await api.mockChannelSubscription(E2E_CHANNEL_ID);
  await page.route(/\/api\/notification-types(\?.*)?$/, (route) =>
    route.fulfill({ json: hydraCollection([]) }),
  );
  const base = {
    occurredAt: '2026-09-20T10:00:00.123456Z',
    isRead: false,
    organizationId: E2E_ORGANIZATION_ID,
    snippet: 'Review the scheduled inspection before tomorrow.',
  };
  const notification = {
    ...base,
    sourceKey: 'notification',
    id: 'same-id',
    kind: 'notification',
    title: 'Inspection assigned to you',
    targetType: 'notification',
    targetId: 'same-id',
    targetKind: null,
  };
  const mention = {
    ...base,
    sourceKey: 'messaging.mention',
    id: 'same-id',
    kind: 'mention',
    title: 'You were mentioned in General',
    targetType: 'conversation',
    targetId: E2E_CHANNEL_ID,
    targetKind: 'channel',
  };
  let recovered = false;
  let read = false;
  let notificationReads = 0;
  let conversationReads = 0;
  let cursorRequests = 0;
  await page.route(/\/api\/inbox(\?.*)?$/, async (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.has('cursor')) {
      expect(query.get('cursor')).toBe('opaque-next-cursor');
      cursorRequests++;
      await route.fulfill({
        json: {
          items: [
            { ...notification, id: 'older', title: 'Earlier confirmed update', isRead: true },
          ],
          complete: true,
          hasMore: false,
          nextPageCursor: null,
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        items: recovered ? [mention, { ...notification, isRead: read }] : [notification],
        complete: recovered,
        hasMore: recovered,
        nextPageCursor: recovered ? 'opaque-next-cursor' : null,
      },
    });
  });
  await page.route(/\/api\/notifications\/same-id\/read$/, async (route) => {
    notificationReads++;
    read = true;
    await route.fulfill({ json: { id: 'same-id', isRead: true } });
  });
  await page.route(new RegExp(`/api/conversations/${E2E_CHANNEL_ID}/read$`), async (route) => {
    conversationReads++;
    await route.fulfill({ json: { conversationId: E2E_CHANNEL_ID } });
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  await expect(page.locator('#dashboard-layout')).toBeVisible();
  await page.goto('/account/notifications');
  const inbox = page.getByTestId('account-inbox-list');
  await expect(inbox.getByTestId('inbox-partial')).toBeVisible();
  await expect(inbox.getByTestId('inbox-item')).toHaveCount(1);
  await expect(inbox.getByRole('button', { name: 'Load more' })).toBeHidden();
  await expectNoHorizontalOverflow(page);
  const capture = `e2e/artifacts/reliability/inbox-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${capture}-partial.png`, fullPage: true, animations: 'disabled' });
  recovered = true;
  const retry = inbox.getByRole('button', { name: 'Retry', exact: true });
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(inbox.getByTestId('inbox-item')).toHaveCount(2);
  await inbox.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(inbox.getByRole('button', { name: 'Mark as read', exact: true })).toBeHidden();
  await inbox.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(inbox.getByTestId('inbox-item')).toHaveCount(3);
  expect(cursorRequests).toBe(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${capture}-complete.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await inbox.getByRole('link', { name: 'Open conversation', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/channels/${E2E_CHANNEL_ID}$`));
  await expect.poll(() => conversationReads).toBeGreaterThan(0);
  expect(notificationReads).toBe(1);
}
