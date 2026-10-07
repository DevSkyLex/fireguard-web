import { expect, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID, organizationOutput } from '../fixtures/api-fixtures';
import { equipmentOutput } from '../fixtures/equipment-fixtures';
import {
  E2E_MEMBER_IRI,
  interventionOutput,
  interventionWorkItemOutput,
} from '../fixtures/intervention-fixtures';
import type { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from './appearance';
import { arrangeInterventionTables } from './intervention-detail-tables';
import { readOutboxOperations, readStore, setAppOffline, setAppOnline } from './offline';

/** Records failed physical work offline, then replays exactly the operator-entered facts. */
export async function recordOfflineMaintenanceResult(page: Page): Promise<void> {
  const intervention = interventionOutput({
    type: 'corrective_maintenance',
    status: 'in_progress',
    responsible: E2E_MEMBER_IRI,
    workItemsCount: 1,
    name: 'Fire pump repair',
  });
  const equipmentId = '00000000-0000-4000-8000-000000000001';
  const target = `/api/equipment/${equipmentId}`;
  const item = interventionWorkItemOutput({
    action: 'repair',
    status: 'in_progress',
    target,
    revision: 7,
    assignee: E2E_MEMBER_IRI,
    targetSummary: { resource: target, kind: 'equipment', label: 'Fire pump — main plant room' },
    allowedActions: { canExecute: true },
  });
  const date = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const workPerformed =
    'Replaced the seal; the pressure test still fails. Follow-up repair required.';
  const writes: Record<string, unknown>[] = [];
  let apiForRefresh: ApiMock | null = null;
  const path = await arrangeInterventionTables(page, true, async (api) => {
    apiForRefresh = api;
    await api.mockSessionData({
      organizations: [
        organizationOutput({
          settings: { regional: { timezone: 'Europe/Paris', dateFormat: 'yyyy-MM-dd' } },
        }),
      ],
    });
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkItems(intervention.id, [item]);
  });
  await page.route(/\/api\/intervention-work-items\/e2e-work-item-1$/, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const input = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(input);
    expect(route.request().headers()['if-match']).toBe('"revision-7"');
    await apiForRefresh?.mockInterventionWorkItems(intervention.id, [
      {
        ...item,
        ...input,
        revision: 8,
        executionResult: {
          ...(input['executionResult'] as Record<string, unknown>),
          authorId: 'e2e-member-1',
          operationId: null,
          occurrenceId: null,
          state: 'staged',
          validatedAt: null,
        },
      } as typeof item,
    ]);
    await route.fulfill({
      status: 200,
      json: {
        ...item,
        ...input,
        revision: 8,
        executionResult: {
          ...(input['executionResult'] as Record<string, unknown>),
          authorId: 'e2e-member-1',
          operationId: null,
          occurrenceId: null,
          state: 'staged',
          validatedAt: null,
        },
      },
    });
  });
  await page.goto(path);
  const toggle = page
    .locator(
      '[data-testid="intervention-work-item-toggle"], [data-testid="intervention-work-item-toggle-card"]',
    )
    .filter({ visible: true })
    .getByRole('checkbox');
  await expect(toggle).toBeEnabled();
  await expect.poll(async () => (await readStore(page, 'workItems')).length).toBeGreaterThan(0);
  await setAppOffline(page);
  await toggle.click();
  const dialog = page.getByTestId('intervention-execution-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('execution-performed-at')).toHaveValue('');
  await page.getByTestId('execution-performed-at').fill(`${date}T12:00`);
  await page.getByTestId('execution-outcome').click();
  await page
    .getByRole('option', { name: 'Unsuccessful — work still required', exact: true })
    .click();
  await expect(
    page.getByRole('option', { name: 'Unsuccessful — work still required', exact: true }),
  ).toBeHidden();
  await expect(page.getByTestId('execution-outcome')).toContainText(
    'Unsuccessful — work still required',
  );
  await page.getByTestId('execution-work').fill(workPerformed);
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(dialog);
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.screenshot({
    path: `tests/e2e/artifacts/intervention-execution/${page.viewportSize()?.width ?? 0}-${theme}-result.png`,
    animations: 'disabled',
  });
  await page.getByTestId('execution-submit').click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await readOutboxOperations(page, intervention.id)).length).toBe(1);
  const queued = (await readOutboxOperations(page, intervention.id))[0];
  expect(queued.type).toBe('work-item.update');
  expect(queued.payload).toMatchObject({
    workItemId: item.id,
    revision: 7,
    status: 'in_progress',
    executionResult: { equipmentId, outcome: 'failed', workPerformed },
  });
  const recordedInstant = (queued.payload['executionResult'] as Record<string, unknown>)[
    'performedAt'
  ];
  expect(recordedInstant).toMatch(new RegExp(`^${date}T12:00:00\\.000[+-]0[12]:00$`));
  expect(writes).toEqual([]);
  await expect(
    page.getByTestId('work-item-execution-summary').filter({ visible: true }),
  ).toContainText(workPerformed);
  await expect(
    page.getByTestId('work-item-execution-summary').filter({ visible: true }),
  ).toContainText('Pending review');
  await setAppOnline(page);
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({
    status: 'in_progress',
    executionResult: queued.payload['executionResult'],
  });
  await expect.poll(async () => (await readOutboxOperations(page, intervention.id)).length).toBe(0);
}

/** Completes a new replacement only after Equipment confirms its real successor, preserving offline replay. */
export async function recordConfirmedReplacementResult(page: Page): Promise<void> {
  const equipmentId = '00000000-0000-4000-8000-000000000011';
  const successorId = '00000000-0000-4000-8000-000000000012';
  const target = `/api/equipment/${equipmentId}`;
  const intervention = interventionOutput({
    type: 'corrective_maintenance',
    status: 'in_progress',
    responsible: E2E_MEMBER_IRI,
    name: 'Extinguisher replacement',
    workItemsCount: 1,
  });
  const item = interventionWorkItemOutput({
    action: 'replacement',
    status: 'in_progress',
    target,
    resultResource: null,
    revision: 7,
    assignee: E2E_MEMBER_IRI,
    targetSummary: { resource: target, kind: 'equipment', label: 'Extinguisher EXT-OLD' },
    allowedActions: { canExecute: true },
  });
  const original = {
    ...equipmentOutput({ id: equipmentId, '@id': target }),
    recordStatus: 'published',
    successorEquipmentId: null as string | null,
  };
  const successor = {
    ...equipmentOutput({ id: successorId, '@id': `/api/equipment/${successorId}` }),
    recordStatus: 'published',
    predecessorEquipmentId: equipmentId,
    assetCode: 'EXT-NEW',
  };
  const apiHolder: { api: ApiMock | null } = { api: null };
  const writes: Record<string, unknown>[] = [];
  const path = await arrangeInterventionTables(page, true, async (api) => {
    apiHolder.api = api;
    await api.mockSessionData({
      organizations: [
        organizationOutput({
          settings: { regional: { timezone: 'Europe/Paris', dateFormat: 'yyyy-MM-dd' } },
        }),
      ],
    });
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkItems(intervention.id, [item]);
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, original);
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, successor);
  });
  const apiForRefresh = apiHolder.api;
  if (!apiForRefresh) throw new Error('The replacement fixture API was not initialized.');
  await page.route(/\/api\/intervention-work-items\/e2e-work-item-1$/, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const input = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(input);
    expect(route.request().headers()['if-match']).toBe('"revision-7"');
    expect(input['resultResource']).toBe(`/api/equipment/${successorId}`);
    const result = {
      ...(input['executionResult'] as Record<string, unknown>),
      authorId: 'e2e-member-1',
      operationId: null,
      occurrenceId: null,
      state: 'staged',
      validatedAt: null,
    };
    const confirmed = { ...item, ...input, revision: 8, executionResult: result } as typeof item;
    await apiForRefresh.mockInterventionWorkItems(intervention.id, [confirmed]);
    await route.fulfill({ status: 200, json: confirmed });
  });
  await page.goto(path);
  const toggle = page
    .locator(
      '[data-testid="intervention-work-item-toggle"], [data-testid="intervention-work-item-toggle-card"]',
    )
    .filter({ visible: true })
    .getByRole('checkbox');
  await expect(toggle).toBeEnabled();
  await expect.poll(async () => (await readStore(page, 'workItems')).length).toBeGreaterThan(0);
  await toggle.click();
  const dialog = page.getByTestId('intervention-execution-dialog');
  const proof = page.getByTestId('execution-replacement-context');
  await expect(proof).toContainText('Confirm the replacement in the equipment dossier');
  const date = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const workPerformed =
    'Installed and commissioned extinguisher EXT-NEW; retained the original equipment history.';
  await page.getByTestId('execution-performed-at').fill(`${date}T12:00`);
  await page.getByTestId('execution-outcome').click();
  await page.getByRole('option', { name: 'Successful', exact: true }).click();
  await expect(page.getByRole('option', { name: 'Successful', exact: true })).toBeHidden();
  await expect(page.getByTestId('execution-outcome')).toContainText('Successful');
  await page.getByTestId('execution-work').fill(workPerformed);
  await page.getByTestId('execution-submit').click();
  await expect(dialog).toBeVisible();
  expect(writes).toEqual([]);
  const replacedOriginal = {
    ...original,
    status: 'decommissioned',
    successorEquipmentId: successorId,
  };
  await apiForRefresh.mockEquipmentDetail(E2E_ORGANIZATION_ID, replacedOriginal);
  await proof.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByTestId('execution-replacement-successor')).toContainText('EXT-NEW');
  await expect(page.getByTestId('execution-performed-at')).toHaveValue(`${date}T12:00`);
  await expect(page.getByTestId('execution-work')).toHaveValue(workPerformed);
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(dialog);
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.screenshot({
    path: `tests/e2e/artifacts/intervention-execution/${page.viewportSize()?.width ?? 0}-${theme}-replacement.png`,
    animations: 'disabled',
  });
  await setAppOffline(page);
  await page.getByTestId('execution-submit').click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await readOutboxOperations(page, intervention.id)).length).toBe(1);
  const queued = (await readOutboxOperations(page, intervention.id))[0];
  expect(queued.payload).toMatchObject({
    revision: 7,
    status: 'completed',
    resultResource: `/api/equipment/${successorId}`,
    executionResult: { equipmentId, outcome: 'successful', workPerformed },
  });
  expect(writes).toEqual([]);
  await setAppOnline(page);
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({
    status: 'completed',
    resultResource: `/api/equipment/${successorId}`,
    executionResult: queued.payload['executionResult'],
  });
  await expect.poll(async () => (await readOutboxOperations(page, intervention.id)).length).toBe(0);
}
