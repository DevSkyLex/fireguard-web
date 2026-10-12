import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { messageOutput } from '../support/fixtures/channel-fixtures';
import { directConversationOutput } from '../support/fixtures/direct-messages-fixtures';
import { E2E_INTERVENTION_ID, E2E_MEMBER_ID } from '../support/fixtures/intervention-fixtures';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';
import {
  arrangeInventory,
  fillConsumption,
  openPreparedInventory,
} from '../support/helpers/intervention-inventory-scenario';
import { arrangeInterventionTime, openTimeJournal } from '../support/helpers/intervention-time';
import {
  readMessagingOutbox,
  readStore,
  readOutboxOperations,
  setAppOffline,
  setAppOnline,
} from '../support/helpers/offline';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const START = new Date('2026-09-16T10:00:00Z');
const AFTER_EXPIRY = new Date('2026-09-17T11:00:00Z');
const COMPLETED_EXPIRY = {
  '@type': 'Error',
  status: 409,
  code: 'idempotency_replay_expired',
  operationCompleted: true,
  type: '/problems/idempotency-replay-expired',
  title: 'Replay response expired',
};

test('acknowledges a committed time entry after response loss and a 25-hour replay using its original key and native id', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(START);
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
    expect(await page.evaluate(() => Date.now())).toBe(AFTER_EXPIRY.getTime());
    await route.fulfill({ status: 409, json: COMPLETED_EXPIRY });
  });
  let reconciledReads = 0;
  await page.route(
    new RegExp(`/api/intervention-work-items/${item.id}/time-entries/[^/?]+$`),
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const id = new URL(route.request().url()).pathname.split('/').at(-1);
      const entry = mock.entries.find((candidate) => candidate.id === id);
      expect(entry).toBeDefined();
      reconciledReads += 1;
      await route.fulfill({
        json: { '@type': 'TimeEntry', '@id': route.request().url(), id, entry },
      });
    },
  );
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
  await page.clock.setFixedTime(AFTER_EXPIRY);
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
    path: info.outputPath('time-retained-before-expired-ack.png'),
    animations: 'disabled',
  });
  await setAppOnline(page);
  await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(0);
  expect(attempts).toHaveLength(2);
  expect(reconciledReads).toBe(1);
  expect(mock.entries).toHaveLength(1);
  await page.getByRole('button', { name: 'Refresh journal', exact: true }).click();
  await expect(page.getByTestId('time-entry')).toHaveCount(1);
  await expect(page.getByText('Awaiting synchronization', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Saved entries: 1', { exact: true })).toBeVisible();
  await expect(page.getByTestId('time-entry')).toBeInViewport();
  await page.screenshot({
    path: info.outputPath('time-expired-completed-ack.png'),
    animations: 'disabled',
  });
});

test('acknowledges a committed message after a 25-hour replay by reconciling its native owner projection', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(START);
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
      expect(await page.evaluate(() => Date.now())).toBe(AFTER_EXPIRY.getTime());
      await route.fulfill({ status: 409, json: COMPLETED_EXPIRY });
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
  await page.clock.setFixedTime(AFTER_EXPIRY);
  await page.reload();
  await expect(page.getByTestId('message-composer-input')).toBeVisible();
  const [persisted] = await readMessagingOutbox(page);
  expect(persisted).toMatchObject({
    id: queued.id,
    idempotencyKey: queued.idempotencyKey,
    payload: queued.payload,
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
  await expect(
    page.getByTestId('message-thread').getByText('Sending…', { exact: true }),
  ).toHaveCount(0);
  await page
    .getByTestId('message-thread')
    .getByText('A durable message survives a lost response.', { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('message-expired-completed-ack.png'),
    animations: 'disabled',
  });
});

test('restores the exact physical receipt durably before dropping a 25-hour expired completed consumption after response loss', async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date(START.getTime() + 123));
  const { path, mock } = await arrangeInventory(page);
  mock.loseNextCommittedResponse = true;
  const attempts: { key: string; body: unknown }[] = [];
  await page.route(
    (url) => url.pathname === `/api/organizations/${E2E_ORGANIZATION_ID}/inventory-consumptions`,
    async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      attempts.push({
        key: route.request().headers()['idempotency-key'],
        body: route.request().postDataJSON(),
      });
      if (attempts.length === 1) return route.fallback();
      expect(attempts[1]).toEqual(attempts[0]);
      expect(mock.receipts).toHaveLength(1);
      expect(await page.evaluate(() => Date.now())).toBe(AFTER_EXPIRY.getTime());
      await route.fulfill({ status: 409, json: COMPLETED_EXPIRY });
    },
  );
  await page.goto(path);
  const section = await openPreparedInventory(page);
  await setAppOffline(page);
  await fillConsumption(page, section);
  await section.getByRole('button', { name: 'Declare consumption', exact: true }).click();
  await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(1);
  const [queued] = await readOutboxOperations(page);
  if (!queued) throw new Error('The original physical fact must be queued durably.');
  expect(queued.idempotencyKey).toMatch(UUID);
  expect(queued.payload['occurredAt']).toBe('2026-09-16T10:00:00.123Z');
  await setAppOnline(page);
  await expect.poll(() => mock.receipts.length).toBe(1);
  expect(mock.receipts[0]?.occurredAt).toBe('2026-09-16T10:00:00+00:00');
  await expect.poll(() => mock.loseNextCommittedResponse).toBe(false);
  await setAppOffline(page);
  expect(attempts[0]?.key).toBe(queued.idempotencyKey);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  });
  await page.clock.setFixedTime(AFTER_EXPIRY);
  await page.reload();
  await page.getByTestId('intervention-inventory-toggle').click();
  expect((await readOutboxOperations(page))[0]).toMatchObject({
    id: queued.id,
    idempotencyKey: queued.idempotencyKey,
    payload: queued.payload,
  });
  await setAppOnline(page);
  await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(0);
  expect(attempts).toHaveLength(2);
  expect(mock.writes).toHaveLength(1);
  expect(mock.receipts).toHaveLength(1);
  expect(mock.receiptLookups).toEqual([queued.payload['clientOperationId']]);
  const snapshots = await readStore(page, 'metadata');
  expect(snapshots).toContainEqual(
    expect.objectContaining({
      interventionId: E2E_INTERVENTION_ID,
      declarations: expect.arrayContaining([expect.objectContaining({ id: mock.receipts[0]?.id })]),
    }),
  );
  await setAppOffline(page);
  await page.reload();
  await page.getByTestId('intervention-inventory-toggle').click();
  await expect(
    section.getByText('Received — reconciliation needed', { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText('Queued locally — awaiting synchronization', { exact: true }),
  ).toHaveCount(0);
  expect(await readOutboxOperations(page)).toEqual([]);
  await section
    .getByText('Received — reconciliation needed', { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('physical-expired-completed-receipt-restored.png'),
    animations: 'disabled',
  });
});

for (const negative of [
  { name: 'an unknown outcome', status: 409, code: 'idempotency_outcome_unknown', completed: true },
  {
    name: 'revoked authorization',
    status: 403,
    code: 'idempotency_replay_expired',
    completed: true,
  },
  {
    name: 'expiry without completion proof',
    status: 409,
    code: 'idempotency_replay_expired',
    completed: undefined,
  },
  {
    name: 'expiry with false completion proof',
    status: 409,
    code: 'idempotency_replay_expired',
    completed: false,
  },
] as const) {
  test(`retains the committed message and original key when 25-hour replay returns ${negative.name}`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(START);
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
        expect(await page.evaluate(() => Date.now())).toBe(AFTER_EXPIRY.getTime());
        await route.fulfill({
          status: negative.status,
          json: {
            ...COMPLETED_EXPIRY,
            status: negative.status,
            code: negative.code,
            operationCompleted: negative.completed,
          },
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
    await page.clock.setFixedTime(AFTER_EXPIRY);
    await page.reload();
    await expect(page.getByTestId('message-composer-input')).toBeVisible();
    const [persisted] = await readMessagingOutbox(page);
    expect(persisted).toMatchObject({
      id: queued.id,
      idempotencyKey: queued.idempotencyKey,
      payload: queued.payload,
    });
    const replayResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        new URL(response.url()).pathname ===
          `/api/conversations/${conversation.id}/messages/${queued.payload.clientId}`,
    );
    await setAppOnline(page);
    const refusal = await replayResponse;
    expect(refusal.status()).toBe(negative.status);
    const problem = (await refusal.json()) as Record<string, unknown>;
    expect(problem['code']).toBe(negative.code);
    expect(problem['operationCompleted']).toBe(negative.completed);
    await expect.poll(async () => (await readMessagingOutbox(page))[0]?.status).toBe('failed');
    const retained = await readMessagingOutbox(page);
    expect(retained).toHaveLength(1);
    expect(retained[0]).toMatchObject({
      id: queued.id,
      idempotencyKey: queued.idempotencyKey,
      payload: queued.payload,
    });
    expect(attempts).toHaveLength(2);
    expect(committed).toHaveLength(1);
  });
}
