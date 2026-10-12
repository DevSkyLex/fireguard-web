import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { messageOutput } from '../support/fixtures/channel-fixtures';
import { directConversationOutput } from '../support/fixtures/direct-messages-fixtures';
import { E2E_MEMBER_ID } from '../support/fixtures/intervention-fixtures';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';
import { arrangeInterventionTime, openTimeJournal } from '../support/helpers/intervention-time';
import {
  readMessagingOutbox,
  readOutboxOperations,
  setAppOffline,
  setAppOnline,
} from '../support/helpers/offline';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('replays a committed time entry after response loss and reload with its persisted HTTP key and native id', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const { path, mock, item } = await arrangeInterventionTime(page);
  const attempts: { key: string; body: Record<string, unknown> }[] = [];
  let lostResponse = false;
  await page.route(`**/api/intervention-work-items/${item.id}/time-entries`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const key = route.request().headers()['idempotency-key'];
    const input = route.request().postDataJSON() as (typeof mock.timeWrites)[number];
    expect(key).toMatch(UUID);
    attempts.push({ key, body: { ...input } });
    if (attempts.length === 1) {
      mock.entries.push({
        ...input,
        workItemId: item.id,
        revision: 1,
        cancelled: false,
        createdBy: E2E_MEMBER_ID,
        updatedBy: E2E_MEMBER_ID,
        createdAt: '2026-09-16T10:00:00Z',
        updatedAt: '2026-09-16T10:00:00Z',
        totalVersions: 1,
        nextBeforeRevision: null,
        versions: [
          {
            revision: 1,
            workedOn: input.workedOn,
            minutes: input.minutes,
            note: input.note,
            cancelled: false,
            actorId: E2E_MEMBER_ID,
            recordedAt: '2026-09-16T10:00:00Z',
          },
        ],
      });
      await route.abort('failed');
      lostResponse = true;
      return;
    }
    expect(attempts[1]).toEqual(attempts[0]);
    expect(mock.entries).toHaveLength(1);
    await route.fulfill({
      status: 201,
      json: {
        '@type': 'TimeEntry',
        '@id': `${route.request().url()}/${input.id}`,
        id: input.id,
        entry: mock.entries[0],
      },
    });
  });
  await page.goto(path);
  await openTimeJournal(page);
  await setAppOffline(page);
  await page.getByTestId('time-new').click();
  await page.getByLabel('Time spent (minutes)').fill('30');
  await page.getByLabel('Note (optional)').fill('Committed before the response was lost');
  await page.getByRole('button', { name: 'Save time', exact: true }).click();
  await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(1);
  const [queued] = await readOutboxOperations(page);
  if (!queued) throw new Error('The time entry must be queued through the real form.');
  expect(queued.idempotencyKey).toMatch(UUID);
  expect(queued.idempotencyKey).not.toBe(queued.id);
  expect(queued.idempotencyKey).not.toBe(queued.payload['id']);
  await setAppOnline(page);
  await expect.poll(() => lostResponse).toBe(true);
  await setAppOffline(page);
  expect(attempts[0]?.key).toBe(queued.idempotencyKey);
  expect(attempts[0]?.body['id']).toBe(queued.payload['id']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  });
  await page.reload();
  await openTimeJournal(page);
  const [persisted] = await readOutboxOperations(page);
  expect(persisted).toMatchObject({
    id: queued.id,
    idempotencyKey: queued.idempotencyKey,
    payload: queued.payload,
  });
  await expect(page.getByTestId('time-entry')).toContainText(
    'Committed before the response was lost',
  );
  await page.screenshot({
    path: info.outputPath('time-response-loss-retained.png'),
    animations: 'disabled',
  });
  await setAppOnline(page);
  await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(0);
  expect(attempts).toHaveLength(2);
  expect(mock.entries).toHaveLength(1);
  await page.getByRole('button', { name: 'Refresh journal', exact: true }).click();
  await expect(page.getByTestId('time-entry')).toHaveCount(1);
});

test('replays a committed message after response loss and reload without changing its HTTP key or client message id', async ({
  page,
}, info) => {
  const api = await mockMessagesWorkspace(page);
  const conversation = directConversationOutput();
  await api.mockConversationDetail(conversation);
  const committed: ReturnType<typeof messageOutput>[] = [];
  const visible: ReturnType<typeof messageOutput>[] = [];
  await api.mockChannelMessages(conversation.id, visible);
  const attempts: { key: string; url: string; ifNoneMatch: string; body: unknown }[] = [];
  let lostResponse = false;
  await page.route(
    new RegExp(`/api/conversations/${conversation.id}/messages/[^/?]+$`),
    async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      const key = route.request().headers()['idempotency-key'];
      const input = route.request().postDataJSON() as { body: string };
      expect(key).toMatch(UUID);
      attempts.push({
        key,
        url: route.request().url(),
        ifNoneMatch: route.request().headers()['if-none-match'],
        body: input,
      });
      if (attempts.length === 1) {
        const clientId = new URL(route.request().url()).pathname.split('/').at(-1);
        if (!clientId) throw new Error('The native message id must be in the PUT path.');
        committed.push(
          messageOutput({
            id: clientId,
            '@id': `/api/messages/${clientId}`,
            conversation: `/api/conversations/${conversation.id}`,
            body: input.body,
          }),
        );
        await route.abort('failed');
        lostResponse = true;
        return;
      }
      expect(attempts[1]).toEqual(attempts[0]);
      expect(committed).toHaveLength(1);
      visible.push(...committed);
      await route.fulfill({
        status: 200,
        json: committed[0],
      });
    },
  );
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages/${conversation.id}`);
  await expect(page.getByTestId('message-composer-input')).toBeVisible();
  await setAppOffline(page);
  await page
    .getByTestId('message-composer-input')
    .fill('A durable message survives a lost response.');
  await page.getByTestId('message-composer-send').click();
  await expect.poll(async () => (await readMessagingOutbox(page)).length).toBe(1);
  const [queued] = await readMessagingOutbox(page);
  if (!queued) throw new Error('The message must be queued through the real composer.');
  expect(queued.idempotencyKey).toMatch(UUID);
  expect(queued.idempotencyKey).not.toBe(queued.id);
  expect(queued.idempotencyKey).not.toBe(queued.payload.clientId);
  await expect.poll(() => lostResponse).toBe(true);
  expect(attempts[0]?.key).toBe(queued.idempotencyKey);
  expect(attempts[0]?.url).toContain(`/messages/${queued.payload.clientId}`);
  expect(attempts[0]?.ifNoneMatch).toBe('*');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  });
  await page.reload();
  await expect(page.getByTestId('message-composer-input')).toBeVisible();
  const [persisted] = await readMessagingOutbox(page);
  expect(persisted).toMatchObject({
    id: queued.id,
    idempotencyKey: queued.idempotencyKey,
    payload: queued.payload,
  });
  await page.screenshot({
    path: info.outputPath('message-response-loss-retained.png'),
    animations: 'disabled',
  });
  await setAppOnline(page);
  await expect.poll(async () => (await readMessagingOutbox(page)).length).toBe(0);
  expect(attempts).toHaveLength(2);
  expect(committed).toHaveLength(1);
  await expect(
    page
      .getByTestId('message-thread')
      .getByText('A durable message survives a lost response.', { exact: true }),
  ).toHaveCount(1);
});

test('creates a new HTTP key when an offline workload conflict changes the accepted payload while retaining native operation ids', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const { path, item } = await arrangeInterventionTime(page);
  const attempts: { key: string; revision: string; body: Record<string, unknown> }[] = [];
  await page.route(`**/api/intervention-work-items/${item.id}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    attempts.push({
      key: route.request().headers()['idempotency-key'],
      revision: route.request().headers()['if-match'],
      body: route.request().postDataJSON(),
    });
    if (attempts.length === 1) {
      return route.fulfill({
        status: 409,
        json: {
          '@id': '/errors/workload',
          '@type': 'Error',
          status: 409,
          title: 'Workload confirmation required',
          detail: 'Daily capacity would be exceeded.',
          code: 'workload_confirmation_required',
          assessment: {
            confirmationRequired: true,
            confirmationToken: 'offline-assessment',
            completeness: 'complete',
            increases: [
              {
                memberId: E2E_MEMBER_ID,
                memberName: 'Ella Uzer',
                date: '2026-09-16',
                reason: 'daily_overload',
                beforeMinutes: 0,
                afterMinutes: 60,
                capacityMinutes: 420,
              },
            ],
          },
        },
      });
    }
    await route.abort('failed');
  });
  await page.goto(path);
  await setAppOffline(page);
  await page.getByTestId('intervention-work-item-menu').click();
  await page.getByRole('menuitem', { name: 'Plan this task', exact: true }).click();
  await page.getByLabel('Work starts on').fill('2026-09-16');
  await page.getByLabel('Work ends on').fill('2026-09-16');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(1);
  const [queued] = await readOutboxOperations(page);
  if (!queued) throw new Error('The planning change must be durably queued.');
  await setAppOnline(page);
  await expect.poll(async () => (await readOutboxOperations(page))[0]?.status).toBe('conflict');
  await page.getByTestId('intervention-sync-blocked-alert-retry').click();
  await page
    .getByTestId('intervention-operations-sheet')
    .locator(`[data-operation-id="${queued.id}"]`)
    .getByRole('button', { name: 'Review and retry' })
    .click();
  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toContainText('Ella Uzer');
  await page.screenshot({
    path: info.outputPath('offline-conflict-reviewed.png'),
    animations: 'disabled',
  });
  await page.getByTestId('workload-confirm').click();
  await expect.poll(() => attempts.length).toBe(2);
  await setAppOffline(page);
  const [changed] = await readOutboxOperations(page);
  expect(changed).toMatchObject({
    id: queued.id,
    payload: {
      clientId: queued.payload['clientId'],
      workItemId: queued.payload['workItemId'],
      workloadConfirmationToken: 'offline-assessment',
    },
  });
  expect(changed?.idempotencyKey).toMatch(UUID);
  expect(changed?.idempotencyKey).not.toBe(queued.idempotencyKey);
  expect(attempts[0]?.key).toBe(queued.idempotencyKey);
  expect(attempts[1]?.key).toBe(changed?.idempotencyKey);
  expect(attempts[1]?.revision).toBe(attempts[0]?.revision);
  expect(attempts[1]?.body).toEqual({
    ...attempts[0]?.body,
    workloadConfirmationToken: 'offline-assessment',
  });
});
