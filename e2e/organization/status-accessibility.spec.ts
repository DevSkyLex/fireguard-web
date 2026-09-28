import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { complianceFacilityTreeOutput } from '../support/fixtures/compliance-fixtures';
import { organizationDashboardOutput } from '../support/fixtures/dashboard-fixtures';
import { directConversationOutput } from '../support/fixtures/direct-messages-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import { expectAccessibleStatus } from '../support/helpers/accessibility-evidence';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';
import { arrangeInterventionTables } from '../support/helpers/intervention-detail-tables';
import { readStore, setAppOffline } from '../support/helpers/offline';
import { deliverPresenceFrame, installPresenceEventSource } from '../support/helpers/presence';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';
import { AssetsExplorerPage } from '../support/pages/assets-explorer.page';
import { FacilitiesPage } from '../support/pages/facilities.page';
import { WorkloadPage } from '../support/pages/workload.page';

/** Holds one mocked endpoint until the scenario explicitly releases it, preserving the API safety net. */
async function holdRequest(page: Page, pattern: RegExp): Promise<() => void> {
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    await pending;
    await route.fallback();
  });
  return () => release?.();
}

test('announces a remote typing signal politely while preserving composer focus', async ({
  page,
}) => {
  await installPresenceEventSource(page);
  await mockMessagesWorkspace(page);
  const conversation = directConversationOutput();
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages/${conversation.id}`);
  const composer = page.getByTestId('message-composer-input');
  await composer.focus();
  await deliverPresenceFrame(page, `/e2e/conversations/${conversation.id}`, {
    type: 'typing.changed',
    memberId: 'e2e-member-2',
    active: true,
  });
  const typing = page.getByTestId('message-typing-indicator');
  await expect(typing).toContainText('Ines Pector');
  await expectAccessibleStatus(page, typing, 'message-typing-status');
  await expect(composer).toBeFocused();
  await deliverPresenceFrame(page, `/e2e/conversations/${conversation.id}`, {
    type: 'typing.changed',
    memberId: 'e2e-member-2',
    active: false,
  });
  await expect(typing).toHaveCount(0);
  await expect(composer).toBeFocused();
});

test('announces saved message loading until the pending request completes', async ({ page }) => {
  await mockMessagesWorkspace(page);
  const release = await holdRequest(page, /\/api\/saved-messages(?:\?|$)/);
  try {
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages/saved`);
    await expectAccessibleStatus(
      page,
      page.getByRole('status').filter({ hasText: 'Loading saved messages' }),
      'saved-messages-loading-status',
    );
  } finally {
    release();
  }
  await expect(page.getByRole('status').filter({ hasText: 'Loading saved messages' })).toHaveCount(
    0,
  );
});

test('announces failed send checking while its conversation permissions are pending', async ({
  page,
}) => {
  const api = await mockMessagesWorkspace(page);
  const conversation = directConversationOutput();
  await api.mockConversationDetail(conversation);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages`);
  await expect(page.getByTestId('direct-messages-panel-failed')).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('fireguard-messaging', 1);
      request.addEventListener('upgradeneeded', () => {
        request.result.createObjectStore('outbox');
        request.result.createObjectStore('metadata');
      });
      request.addEventListener('error', () => reject(request.error));
      request.addEventListener('success', () => {
        const database = request.result;
        const transaction = database.transaction(['outbox', 'metadata'], 'readwrite');
        transaction.objectStore('metadata').put('e2e-user-1', 'ownerUserId');
        transaction.objectStore('outbox').put(
          {
            id: 'accessible-failure',
            conversationId: 'e2e-direct-2',
            type: 'message.send',
            status: 'failed',
            error: 'Send rejected',
            createdAt: new Date().toISOString(),
            payload: {
              clientId: 'accessible-failure-client',
              conversationId: 'e2e-direct-2',
              input: { body: 'Keep this draft available.' },
            },
          },
          'accessible-failure',
        );
        transaction.addEventListener('complete', () => {
          database.close();
          resolve();
        });
        transaction.addEventListener('error', () => reject(transaction.error));
      });
    });
  });
  const release = await holdRequest(page, /\/api\/conversations\/e2e-direct-2$/);
  try {
    await page.getByTestId('direct-messages-panel-failed').click();
    await expectAccessibleStatus(
      page,
      page.getByRole('status').filter({ hasText: 'Checking failed sends' }),
      'failed-messages-loading-status',
    );
  } finally {
    release();
  }
  await expect(page.getByTestId('failed-send')).toContainText('Keep this draft available.');
});

test('announces attachment loading and explains unavailable actions after going offline', async ({
  page,
}) => {
  const url = await arrangeInterventionTables(page);
  const release = await holdRequest(page, /\/api\/interventions\/e2e-intervention-1\/attachments$/);
  try {
    await page.goto(`${url}?tab=attachments`);
    await expectAccessibleStatus(
      page,
      page.getByRole('status').filter({ hasText: 'Loading intervention files' }),
      'intervention-files-loading-status',
    );
  } finally {
    release();
  }
  await expect(
    page.getByRole('status').filter({ hasText: 'Loading intervention files' }),
  ).toHaveCount(0);
  await setAppOffline(page);
  await expectAccessibleStatus(
    page,
    page.getByTestId('intervention-attachments-offline-reason'),
    'intervention-files-offline-status',
  );
});

test('announces the cached intervention source when a fresh workspace cannot be retrieved', async ({
  page,
}) => {
  const url = await arrangeInterventionTables(page);
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Table regression intervention', exact: true }),
  ).toBeVisible();
  await expect.poll(async () => (await readStore(page, 'interventions')).length).toBeGreaterThan(0);
  await setAppOffline(page);
  await page.route(/\/api\/interventions\/e2e-intervention-1(?:\?|$)/, (route) =>
    route.abort('internetdisconnected'),
  );
  await page.reload();
  await expectAccessibleStatus(
    page,
    page.getByTestId('intervention-detail-offline-notice'),
    'intervention-cache-offline-status',
  );
});

test('announces both assets tree loading states until their own endpoints resolve', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
  await api.mockComplianceFacilityTree(E2E_ORGANIZATION_ID, complianceFacilityTreeOutput());
  const assets = new AssetsExplorerPage(page);
  const releaseSites = await holdRequest(
    page,
    /\/api\/organizations\/e2e-org-1\/facilities(?:\?|$)/,
  );
  try {
    await assets.goto(E2E_ORGANIZATION_ID);
    await expectAccessibleStatus(
      page,
      page.getByTestId('assets-tree-loading'),
      'assets-sites-loading-status',
    );
  } finally {
    releaseSites();
  }
  await expect(assets.treeItems).toHaveCount(1);
  const releaseCompliance = await holdRequest(
    page,
    /\/api\/organizations\/e2e-org-1\/facility-tree$/,
  );
  try {
    await assets.openComplianceAxis();
    await expectAccessibleStatus(
      page,
      page.getByTestId('assets-compliance-tree-loading'),
      'assets-compliance-loading-status',
    );
  } finally {
    releaseCompliance();
  }
  await expect(assets.complianceTreeItems).toHaveCount(1);
});

test('announces the organization picker loading state until available workspaces arrive', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const release = await holdRequest(page, /\/api\/organizations(?:\?|$)/);
  try {
    await page.goto('/organizations/select');
    await expectAccessibleStatus(
      page,
      page.getByRole('status', { name: 'Loading your organizations' }),
      'organization-picker-loading-status',
    );
  } finally {
    release();
  }
  await expect(page.getByRole('status', { name: 'Loading your organizations' })).toHaveCount(0);
});

test('announces severity skeletons without turning the layout into a form output', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationDashboard(E2E_ORGANIZATION_ID, organizationDashboardOutput());
  const release = await holdRequest(page, /\/api\/organizations\/e2e-org-1\/dashboard(?:\?|$)/);
  try {
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}`);
    await page.getByRole('button', { name: 'Additional analysis' }).click();
    await expectAccessibleStatus(
      page,
      page.getByRole('status', { name: 'Loading severity breakdown…' }),
      'dashboard-severity-loading-status',
    );
  } finally {
    release();
  }
  await expect(page.getByRole('status', { name: 'Loading severity breakdown…' })).toHaveCount(0);
});

test('announces workload refresh while the previous projection remains visible', async ({
  page,
}) => {
  await new ApiMock(page).mockAuthenticatedSession();
  await new WorkloadApiMock(page).projection();
  const view = new WorkloadPage(page);
  await view.goto();
  await expect(view.matrix).toBeVisible();
  const release = await holdRequest(page, /\/api\/organizations\/e2e-org-1\/workload(?:\?|$)/);
  try {
    await page.getByRole('button', { name: 'Next week', exact: true }).click();
    await expectAccessibleStatus(
      page,
      page.getByRole('status').filter({ hasText: 'Updating… Previous data remains visible.' }),
      'workload-refresh-status',
    );
    await expect(view.matrix).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByRole('status').filter({ hasText: 'Updating… Previous data remains visible.' }),
  ).toHaveCount(0);
});

test('announces the pending facility map request without moving keyboard focus', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()]);
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort());
  const release = await holdRequest(
    page,
    /\/api\/organizations\/e2e-org-1\/facilities\?.*hasCoordinates=true/,
  );
  try {
    await new FacilitiesPage(page).gotoMap(E2E_ORGANIZATION_ID);
    const toggle = page.getByTestId('facility-map-compliance-toggle').getByRole('switch');
    await toggle.focus();
    await expectAccessibleStatus(
      page,
      page.getByRole('status').filter({ hasText: 'Refreshing…' }),
      'facility-map-refresh-status',
    );
    await expect(toggle).toBeFocused();
  } finally {
    release();
  }
  await expect(page.getByRole('status').filter({ hasText: 'Refreshing…' })).toHaveCount(0);
});
