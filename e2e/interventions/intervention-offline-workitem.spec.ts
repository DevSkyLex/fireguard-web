import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionWorkItemOutput,
} from '../support/fixtures/intervention-fixtures';
import {
  readOutboxOperations,
  readStore,
  setAppOffline,
  setAppOnline,
} from '../support/helpers/offline';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

/**
 * IF-7 — ticking a checklist item offline, the single most representative field
 * action ("agent completes a work item on site with no signal"). Unlike the
 * conflict specs, this drives the real store queueing path (not a seeded outbox
 * op): the store optimistically marks the item done, queues a `work-item.update`
 * operation, and replays it on reconnect.
 */
test.describe('Intervention offline — work-item checklist queue (IF-7)', () => {
  const organization = organizationOutput();
  const intervention = interventionOutput();
  const workItem = interventionWorkItemOutput();

  test.beforeEach(async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkspace(intervention.id, { workItems: [workItem] });
    await api.mockInterventionPlanningOptions(organization.id);
    await api.mockWorkItemUpdateReplay();

    const detail = new InterventionDetailPage(page);
    await detail.goto(organization.id, intervention.id);
    await expect
      .poll(() => readStore(page, 'interventions').then((rows) => rows.length))
      .toBeGreaterThan(0);
  });

  test('completes a checklist item offline and replays it on reconnect', async ({ page }) => {
    const detail = new InterventionDetailPage(page);
    await expect(detail.firstWorkItemToggle).toBeVisible();

    await setAppOffline(page);
    await detail.firstWorkItemToggle.click();

    // Optimistically marked done and queued as a work-item.update.
    await expect(detail.firstWorkItemToggle).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() =>
        readOutboxOperations(page, intervention.id).then((ops) =>
          ops.filter((op) => op.type === 'work-item.update').map((op) => op.payload['status']),
        ),
      )
      .toContain('completed');
    await expect(detail.waitingBanner).toBeVisible();

    // Reconnect → the queued status change replays and the outbox drains.
    await setAppOnline(page);
    await expect
      .poll(() => readOutboxOperations(page, intervention.id).then((ops) => ops.length))
      .toBe(0);
    await expect(detail.waitingBanner).toHaveCount(0);
  });
});
