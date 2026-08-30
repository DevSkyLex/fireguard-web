import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_MEMBER_IRI, interventionOutput } from '../support/fixtures/intervention-fixtures';
import { setDarkTheme } from '../support/helpers/appearance';
import {
  readStore,
  seedOutboxOperations,
  setAppOffline,
  setAppOnline,
} from '../support/helpers/offline';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

/**
 * A blocked outbox replay is the one offline state where field data is at risk,
 * and the shell's header indicator alone reported it — a 12px glyph behind a
 * popover, invisible to the sighted agent on the very workspace holding the
 * data. `InterventionDetailPage` now renders `app-intervention-sync-blocked-alert`
 * on the page. This spec drives the real outbox: it seeds two operations a
 * replay left `conflict`/`failed`, then walks offline→online so the coordinator
 * recomputes its blocked count from IndexedDB, exactly as a failed replay does.
 */

const interventionId = 'e2e-sync-alert-1';

const intervention = interventionOutput({
  id: interventionId,
  '@id': `/api/interventions/${interventionId}`,
  number: 903,
  name: 'Annual sprinkler riser inspection',
  status: 'in_progress',
  responsible: E2E_MEMBER_IRI,
  allowedTransitions: ['submitted', 'changes_requested', 'abandoned'],
  workItemsCount: 0,
  completedWorkItemsCount: 0,
});

async function mockDetailPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(interventionId, []);
  await api.mockInterventionChanges(interventionId, []);
  await api.mockInterventionIssues(interventionId, []);
  await api.mockInterventionActivities(interventionId, []);
  await api.mockInterventionAttachments(interventionId, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

async function blockTheOutbox(page: Page): Promise<void> {
  await expect
    .poll(async () => (await readStore(page, 'interventions')).length, { timeout: 10_000 })
    .toBeGreaterThan(0);
  await seedOutboxOperations(page, [
    {
      id: 'e2e-sync-alert-op-1',
      interventionId,
      type: 'work-item.update',
      payload: { workItemId: 'wi-1', status: 'completed' },
      createdAt: '2026-08-28T09:00:00.000Z',
      status: 'conflict',
      error: 'This work item was changed on the server while you were offline.',
    },
    {
      id: 'e2e-sync-alert-op-2',
      interventionId,
      type: 'comment.create',
      payload: { body: 'Riser valve replaced.' },
      createdAt: '2026-08-28T09:04:00.000Z',
      status: 'failed',
      error: 'The server refused this comment.',
    },
  ]);
  await setAppOffline(page);
  await setAppOnline(page);
}

test.describe('Intervention detail — a blocked outbox surfaces on the workspace', () => {
  test('names each blocked operation on the page and offers a retry', async ({ page }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);
    await expect(detail.root).toBeVisible();

    await blockTheOutbox(page);

    const alert = page.getByTestId('intervention-sync-blocked-alert');
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(alert).toContainText('2 changes could not be sent');
    await expect(alert).toContainText('Work item update');
    await expect(alert).toContainText('New comment');
    await expect(alert).toContainText('The server refused this comment.');
    await expect(page.getByTestId('intervention-sync-blocked-alert-retry')).toBeVisible();
  });

  test('renders the blocked alert legibly in dark mode', async ({ page, context, baseURL }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);
    await setDarkTheme(context, baseURL as string);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);
    await expect(detail.root).toBeVisible();

    await blockTheOutbox(page);

    await expect(page.getByTestId('intervention-sync-blocked-alert')).toBeVisible({
      timeout: 15_000,
    });
  });
});
