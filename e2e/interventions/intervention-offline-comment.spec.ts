import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import {
  readOutboxOperations,
  readStore,
  setAppOffline,
  setAppOnline,
} from '../support/helpers/offline';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

/**
 * IF-25 — comments can be created offline. The composer stays enabled offline,
 * a comment is queued as an idempotent `comment.create` outbox operation and
 * shown optimistically as authored by "You", then replayed automatically once
 * connectivity returns — the field agent's note is never lost.
 */
test.describe('Intervention offline — comment queue and replay (IF-25/IF-5)', () => {
  const organization = organizationOutput();
  const intervention = interventionOutput();
  let api: ApiMock;

  test.beforeEach(async ({ page }) => {
    api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkspace(intervention.id);
    await api.mockInterventionPlanningOptions(organization.id);
    await api.mockCommentCreate(intervention.id);

    const detail = new InterventionDetailPage(page);
    await detail.goto(organization.id, intervention.id);
    // The offline-first workspace snapshot must be cached before we go offline
    // so the sync coordinator can resolve the intervention's organization on
    // replay (it reads the intervention from IndexedDB).
    await expect
      .poll(() => readStore(page, 'interventions').then((rows) => rows.length))
      .toBeGreaterThan(0);
  });

  test('queues a comment offline, shows it as "You", and replays it on reconnect', async ({
    page,
  }) => {
    const detail = new InterventionDetailPage(page);

    await setAppOffline(page);
    // IF-25: the composer stays usable offline and explains what happens.
    await expect(detail.offlineCommentHint).toBeVisible();

    await detail.submitComment('Checked the extinguisher on site');

    // The optimistic entry appears immediately, attributed to the local author
    // ("You") until the synced entry replaces it.
    await expect(detail.lastCommentCard).toContainText('Checked the extinguisher on site');
    await expect(detail.lastCommentCard).toContainText('You');

    // Persisted as an idempotent `comment.create` operation carrying a clientId.
    await expect
      .poll(() =>
        readOutboxOperations(page, intervention.id).then((ops) => ops.map((op) => op.type)),
      )
      .toContain('comment.create');
    const queued = await readOutboxOperations(page, intervention.id);
    expect(queued).toHaveLength(1);
    expect(typeof queued[0]?.payload['clientId']).toBe('string');

    // Pending (synchronizable), so the amber "waiting to sync" banner shows and
    // the red sync-blocked banner does not.
    await expect(detail.waitingBanner).toBeVisible();
    await expect(detail.syncBlockedBanner).toHaveCount(0);

    // Reconnect → the background coordinator replays the comment and the outbox
    // drains: zero data loss. The POST actually fired (the drain is a real
    // server round-trip, not some alternate dequeue).
    await setAppOnline(page);
    await expect
      .poll(() => readOutboxOperations(page, intervention.id).then((ops) => ops.length))
      .toBe(0);
    await expect(detail.waitingBanner).toHaveCount(0);
    expect(api.commentCreateCount).toBe(1);
  });

  test('queues a comment when online but the server is unreachable (IF-5)', async ({ page }) => {
    const detail = new InterventionDetailPage(page);

    // Stay ONLINE, but make the comment POST fail at the network layer (status 0)
    // — a captive portal / dropped connection. The store must queue optimistically
    // via its isNetworkFailure fallback, not surface a failure.
    await api.mockCommentCreateNetworkError(intervention.id);
    await detail.submitComment('Note from a dead cell');

    await expect(detail.lastCommentCard).toContainText('Note from a dead cell');
    await expect(detail.lastCommentCard).toContainText('You');
    await expect
      .poll(() =>
        readOutboxOperations(page, intervention.id).then((ops) => ops.map((op) => op.type)),
      )
      .toContain('comment.create');
    await expect(detail.waitingBanner).toBeVisible();
    await expect(detail.syncBlockedBanner).toHaveCount(0);

    // Server reachable again → "Sync now" drains the queued note.
    await api.mockCommentCreate(intervention.id);
    await detail.syncNowButton.click();
    await expect
      .poll(() => readOutboxOperations(page, intervention.id).then((ops) => ops.length))
      .toBe(0);
  });
});
