import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import {
  E2E_INTERVENTION_ID,
  interventionOutput,
  outboxOperation,
} from '../support/fixtures/intervention-fixtures';
import {
  readOutboxOperations,
  readStore,
  seedOutboxOperations,
  setAppOffline,
  setAppOnline,
  type OutboxRecord,
} from '../support/helpers/offline';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

/**
 * IF-4 / IF-16 / IF-3 — the sync engine's handling of replay failures, proven
 * end to end. Operations are seeded into the IndexedDB outbox (owner binding is
 * inert in e2e), then a reconnect drives a real replay cycle against mocked
 * server responses so the outcome — rebase, dependent-blocking, transient
 * retry — is observed through the live UI and IndexedDB, exactly as a field
 * agent would.
 */
const organization = organizationOutput();

/** Boots the app to the intervention workspace with an all-green happy path. */
async function landOnDetail(
  page: Page,
  api: ApiMock,
  intervention = interventionOutput(),
): Promise<InterventionDetailPage> {
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkspace(intervention.id);
  await api.mockInterventionPlanningOptions(organization.id);

  const detail = new InterventionDetailPage(page);
  await detail.goto(organization.id, intervention.id);
  // Cache the workspace snapshot so replay can resolve the intervention's org.
  await expect
    .poll(() => readStore(page, 'interventions').then((rows) => rows.length))
    .toBeGreaterThan(0);
  return detail;
}

/**
 * A dependency chain: an equipment create, plus a work item that targets the
 * (client-side) equipment IRI it would create. When the equipment create is
 * blocked, the work item depends on a resource that does not yet exist.
 */
function dependentEquipmentChain(): ReadonlyArray<OutboxRecord> {
  return [
    outboxOperation({
      id: 'op-equipment-create',
      type: 'equipment.create',
      payload: { clientId: 'e2e-equipment-client', type: 'fire_extinguisher' },
      createdAt: '2026-07-01T00:00:00.001Z',
    }),
    outboxOperation({
      id: 'op-work-item-create',
      type: 'work-item.create',
      payload: {
        clientId: 'e2e-work-item-client',
        intervention: `/api/interventions/${E2E_INTERVENTION_ID}`,
        action: 'inventory',
        target: '/api/equipment/e2e-equipment-client',
        source: 'discovered',
        required: false,
      },
      createdAt: '2026-07-01T00:00:00.002Z',
    }),
  ];
}

test.describe('Intervention offline — sync conflict handling (IF-4/IF-16/IF-3)', () => {
  test('IF-4: rebases a stale 412 update so Retry succeeds instead of looping', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    // The server is at revision 1; the queued update carries the stale revision 0.
    const detail = await landOnDetail(page, api, interventionOutput({ revision: 1 }));
    await api.mockInterventionUpdateRebase(E2E_INTERVENTION_ID, 1);

    await setAppOffline(page);
    await seedOutboxOperations(page, [
      outboxOperation({
        id: 'op-stale-update',
        type: 'intervention.update',
        payload: { clientId: 'e2e-update-client', status: 'in_progress', revision: 0 },
        createdAt: '2026-07-01T00:00:00.001Z',
      }),
    ]);
    await setAppOnline(page);

    // Replay hits 412; the engine re-fetches the current revision and rebases the
    // payload onto it, surfacing an actionable conflict instead of looping.
    await expect(detail.syncBlockedBanner).toBeVisible();
    await expect
      .poll(() => readOutboxOperations(page, E2E_INTERVENTION_ID).then((ops) => ops[0]?.status))
      .toBe('conflict');
    await expect
      .poll(() =>
        readOutboxOperations(page, E2E_INTERVENTION_ID).then((ops) => ops[0]?.payload['revision']),
      )
      .toBe(1);

    // Retry now sends the fresh If-Match and succeeds — the loop is broken and
    // the outbox drains. Wait for the button to be enabled (the first cycle has
    // finished syncing) so the click can't be swallowed by an in-flight syncAll.
    await expect(detail.retryButton).toBeEnabled();
    await detail.retryButton.click();
    await expect
      .poll(() => readOutboxOperations(page, E2E_INTERVENTION_ID).then((ops) => ops.length))
      .toBe(0);
    await expect(detail.syncBlockedBanner).toHaveCount(0);
  });

  test('IF-16: surfaces a dependent of a permanently-failed create as failed', async ({ page }) => {
    const api = new ApiMock(page);
    const detail = await landOnDetail(page, api);
    await api.mockEquipmentCreateReplay(422); // permanent failure

    await setAppOffline(page);
    await seedOutboxOperations(page, dependentEquipmentChain());
    await setAppOnline(page);

    // Both the failed parent create AND its dependent work item are surfaced as
    // blocked — the dependent is not left invisibly pending.
    await expect(detail.syncBlockedBanner).toContainText('2 synchronization operation');
    await expect
      .poll(() =>
        readOutboxOperations(page, E2E_INTERVENTION_ID).then(
          (ops) => ops.filter((op) => op.status === 'failed').length,
        ),
      )
      .toBe(2);
    expect(api.equipmentCreateReplayCount).toBeGreaterThan(0);
  });

  test('IF-3: keeps a transient (5xx) create and its dependent pending, not failed', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    const detail = await landOnDetail(page, api);
    await api.mockEquipmentCreateReplay(503); // transient failure
    await api.mockCommentCreate(E2E_INTERVENTION_ID); // the independent op succeeds

    await setAppOffline(page);
    // The transient equipment chain, plus an independent comment queued LAST that
    // will succeed on replay — its drain is a deterministic proof that the cycle
    // ran to completion past the transient ops (no reliance on timing).
    await seedOutboxOperations(page, [
      ...dependentEquipmentChain(),
      outboxOperation({
        id: 'op-independent-comment',
        type: 'comment.create',
        payload: { clientId: 'e2e-comment-client', body: '<p>Independent note</p>' },
        createdAt: '2026-07-01T00:00:00.003Z',
      }),
    ]);
    await setAppOnline(page);

    // Cycle-completion gate: the independent op drains, so the whole outbox was
    // replayed — including the transient equipment ops before it.
    await expect
      .poll(() =>
        readOutboxOperations(page, E2E_INTERVENTION_ID).then((ops) =>
          ops.some((op) => op.type === 'comment.create'),
        ),
      )
      .toBe(false);

    // The transient chain survived untouched: still two operations, still pending
    // (never failed, never dropped), and no red sync-blocked banner.
    const ops = await readOutboxOperations(page, E2E_INTERVENTION_ID);
    expect(ops).toHaveLength(2);
    expect(ops.every((op) => op.status === 'pending' || op.status === undefined)).toBe(true);
    await expect(detail.syncBlockedBanner).toHaveCount(0);
    expect(api.equipmentCreateReplayCount).toBeGreaterThan(0);
  });

  test('IF-6: dequeues a create the server already applied (idempotent replay)', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    const detail = await landOnDetail(page, api);
    // The server already created this resource in an earlier partial sync, so the
    // replay is answered "already exists" (409 wins over the permanent-failure set).
    await api.mockEquipmentCreateReplay(409, {
      problemType: '/problems/client-resource-already-exists',
    });

    await setAppOffline(page);
    await seedOutboxOperations(page, [
      outboxOperation({
        id: 'op-already-applied',
        type: 'equipment.create',
        payload: { clientId: 'e2e-equipment-client', type: 'fire_extinguisher' },
        createdAt: '2026-07-01T00:00:00.001Z',
      }),
    ]);
    await setAppOnline(page);

    await expect.poll(() => api.equipmentCreateReplayCount).toBeGreaterThan(0);
    // Dequeued as done — not looping, not failed, no phantom blocked state.
    await expect
      .poll(() => readOutboxOperations(page, E2E_INTERVENTION_ID).then((ops) => ops.length))
      .toBe(0);
    await expect(detail.syncBlockedBanner).toHaveCount(0);
    await expect(detail.waitingBanner).toHaveCount(0);
  });

  test('IF-8: Discard clears blocked operations from the outbox', async ({ page }) => {
    const api = new ApiMock(page);
    const detail = await landOnDetail(page, api);
    await api.mockEquipmentCreateReplay(422); // permanent failure → blocked

    await setAppOffline(page);
    await seedOutboxOperations(page, dependentEquipmentChain());
    await setAppOnline(page);

    // Reach the blocked state (both ops failed), then discard.
    await expect(detail.syncBlockedBanner).toBeVisible();
    await detail.discardBlocked();

    // The rejected work is dropped and the blocked banner clears.
    await expect
      .poll(() => readOutboxOperations(page, E2E_INTERVENTION_ID).then((ops) => ops.length))
      .toBe(0);
    await expect(detail.syncBlockedBanner).toHaveCount(0);
  });
});
