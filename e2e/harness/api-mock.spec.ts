import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  organizationDashboardOutput,
} from '../support/fixtures/dashboard-fixtures';
import { directConversationOutput } from '../support/fixtures/direct-messages-fixtures';
import {
  E2E_FACILITY_ID,
  facilityAttachmentOutput,
  facilityOutput,
  facilityPlanOverlayOutput,
} from '../support/fixtures/facility-fixtures';
import { API_BASE_URL, ApiMock } from '../support/mocks/api-mock';

const families = [
  {
    path: '/api/direct-conversations',
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    register: (api: ApiMock) => api.mockDirectConversationList([directConversationOutput()]),
  },
  {
    path: '/api/saved-messages',
    organization: E2E_ORGANIZATION_ID,
    register: (api: ApiMock) => api.mockSavedMessages(),
  },
  {
    path: '/api/channels',
    organization: E2E_ORGANIZATION_ID,
    register: (api: ApiMock) => api.mockChannelList(),
  },
  {
    path: '/api/maintenance/schedules',
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    register: (api: ApiMock) => api.mockMaintenanceScheduleList(),
  },
  {
    path: '/api/interventions',
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    register: (api: ApiMock) => api.mockInterventionList(E2E_ORGANIZATION_ID),
  },
  {
    path: '/api/imports',
    organization: E2E_ORGANIZATION_ID,
    register: (api: ApiMock) => api.mockImportJobList(),
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('http://harness.test/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Hermetic harness</p>' }),
  );
  await page.goto('http://harness.test/');
});

for (const family of families) {
  test(`serves only the scoped GET collection for ${family.path}`, async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await family.register(api);
    const status = await page.evaluate(
      async ({ path, organization }) =>
        (
          await fetch(
            `${path}?organization=${encodeURIComponent(organization)}&page=2&search=North`,
          )
        ).status,
      { path: family.path, organization: family.organization },
    );
    expect(status).toBe(200);
  });

  for (const scenario of ['wrong-method', 'wrong-organization', 'missing-organization'] as const) {
    test(`fails the hermetic test on ${scenario} at ${family.path}`, async ({ page }, info) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await family.register(api);
      const status = await page.evaluate(
        async ({ path, organization, scenario: rejection }) => {
          const query =
            rejection === 'missing-organization'
              ? ''
              : `?organization=${encodeURIComponent(rejection === 'wrong-organization' ? 'wrong-org' : organization)}`;
          return (
            await fetch(`${path}${query}`, {
              method: rejection === 'wrong-method' ? 'POST' : 'GET',
            })
          ).status;
        },
        { path: family.path, organization: family.organization, scenario },
      );
      expect(status).toBe(404);
      await expect
        .poll(() => info.errors.some((error) => error.message?.includes('Hermetic safety net')))
        .toBe(true);
      test.fail(true, 'Verified the intended safety-net failure after checking the 404 response.');
    });
  }
}

test('fails even when an unexpected API request is handled by the page', async ({ page }, info) => {
  await new ApiMock(page).mockSavedMessages();
  await page.evaluate(async () => {
    await fetch('/api/unregistered').catch(() => undefined);
  });
  await expect
    .poll(() => info.errors.some((error) => error.message?.includes('/api/unregistered')))
    .toBe(true);
  test.fail(true, 'Verified that the swallowed request still recorded a safety-net failure.');
});

test('serves logout only through POST', async ({ page }) => {
  const api = new ApiMock(page);
  await api.mockLogout();

  const status = await page.evaluate(
    async (url) => (await fetch(url, { method: 'POST' })).status,
    `${API_BASE_URL}/api/auth/logout`,
  );

  expect(status).toBe(200);
});

test('rejects a read against the logout action', async ({ page }, info) => {
  const api = new ApiMock(page);
  await api.mockLogout();

  const status = await page.evaluate(
    async (url) => (await fetch(url)).status,
    `${API_BASE_URL}/api/auth/logout`,
  );

  expect(status).toBe(404);
  await expect
    .poll(() => info.errors.some((error) => error.message?.includes('Hermetic safety net')))
    .toBe(true);
  test.fail(true, 'Verified that logout cannot be satisfied through GET.');
});

test('composes a direct-conversation POST with its strict list GET', async ({ page }) => {
  const api = new ApiMock(page);
  await api.mockDirectConversationList([directConversationOutput()]);
  await api.mockDirectConversationOpen(directConversationOutput());
  const result = await page.evaluate(async (organization) => {
    const opened = await fetch('/api/direct-conversations', {
      method: 'POST',
      body: JSON.stringify({ organization }),
    });
    const listed = await fetch(`/api/direct-conversations?organization=${organization}`);
    return [opened.status, listed.status];
  }, `/api/organizations/${E2E_ORGANIZATION_ID}`);
  expect(result).toEqual([200, 200]);
});

for (const path of ['checklists', 'calendar/feed', 'teams']) {
  test(`rejects writes to the populated visual ${path} catalog`, async ({ page }, info) => {
    const api = new ApiMock(page);
    await api.mockChecklistList(E2E_ORGANIZATION_ID);
    await api.mockCalendarFeed(E2E_ORGANIZATION_ID);
    await api.mockOrganizationTeams(E2E_ORGANIZATION_ID);
    const status = await page.evaluate(
      async (target) => (await fetch(target, { method: 'POST' })).status,
      `/api/organizations/${E2E_ORGANIZATION_ID}/${path}`,
    );
    expect(status).toBe(404);
    await expect
      .poll(() => info.errors.some((error) => error.message?.includes('Hermetic safety net')))
      .toBe(true);
    test.fail(true, 'Verified that the catalog write was rejected by the safety net.');
  });
}

test('scopes saved conversation resolution to an exact read-only resource', async ({
  page,
}, info) => {
  const api = new ApiMock(page);
  const conversation = directConversationOutput();
  await api.mockConversationDetail(conversation);
  const results = await page.evaluate(async (id) => {
    const resolved = await fetch(`/api/conversations/${id}`);
    const rejected = await fetch(`/api/conversations/${id}`, { method: 'PATCH' });
    return { resource: await resolved.json(), rejected: rejected.status };
  }, conversation.id);
  expect(results.resource).toEqual(conversation);
  expect(results.rejected).toBe(404);
  await expect
    .poll(() => info.errors.some((error) => error.message?.includes('Hermetic safety net')))
    .toBe(true);
  test.fail(true, 'Verified the conversation PATCH cannot match its GET fixture.');
});

for (const suffix of [
  '',
  '/trends/inspections',
  '/trends/non-conformities-opened',
  '/trends/non-conformities-resolved',
  '/trends/equipment-created',
  '/trends/facilities-created',
]) {
  test(`serves only the exact organization's GET dashboard${suffix}`, async ({ page }, info) => {
    const api = new ApiMock(page);
    await api.mockOrganizationDashboard(E2E_ORGANIZATION_ID, organizationDashboardOutput());
    await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, inspectionsTrendOutput());
    await api.mockDashboardNonConformitiesOpenedTrend(
      E2E_ORGANIZATION_ID,
      nonConformitiesOpenedTrendOutput(),
    );
    await api.mockDashboardNonConformitiesResolvedTrend(
      E2E_ORGANIZATION_ID,
      nonConformitiesResolvedTrendOutput(),
    );
    await api.mockDashboardEquipmentCreatedTrend(
      E2E_ORGANIZATION_ID,
      equipmentCreatedTrendOutput(),
    );
    await api.mockDashboardFacilitiesCreatedTrend(
      E2E_ORGANIZATION_ID,
      facilitiesCreatedTrendOutput(),
    );
    const responses = await page.evaluate(
      async ({ organization, suffix: path }) => {
        const target = `/api/organizations/${organization}/dashboard${path}?compare=true`;
        const accepted = await fetch(target);
        const wrongMethod = await fetch(target, { method: 'POST' });
        const wrongOrganization = await fetch(`/api/organizations/wrong-org/dashboard${path}`);
        return [accepted.status, wrongMethod.status, wrongOrganization.status];
      },
      { organization: E2E_ORGANIZATION_ID, suffix },
    );
    expect(responses).toEqual([200, 404, 404]);
    await expect
      .poll(
        () => info.errors.filter((error) => error.message?.includes('Hermetic safety net')).length,
      )
      .toBe(2);
    test.fail(
      true,
      'Verified both dashboard requests were rejected after the scoped GET succeeded.',
    );
  });
}

for (const suffix of [
  '',
  '/children',
  '/descendants',
  '/equipment',
  '/inspections',
  '/plan-overlay',
]) {
  test(`scopes facility focus-fixture GET ${suffix || 'detail'} by method and organization`, async ({
    page,
  }, info) => {
    const api = new ApiMock(page);
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
    await api.mockFacilityChildren(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, []);
    await api.mockFacilityDescendants(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, []);
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);
    await api.mockFacilityPlanOverlay(
      E2E_ORGANIZATION_ID,
      E2E_FACILITY_ID,
      facilityPlanOverlayOutput(),
    );
    const results = await page.evaluate(
      async ({ base, organization, facility, suffix: path }) => {
        const target = `${base}/api/organizations/${organization}/facilities/${facility}${path}`;
        const accepted = await fetch(target);
        const write = await fetch(target, { method: 'PATCH' });
        const wrongOrganization = await fetch(
          `${base}/api/organizations/wrong-org/facilities/${facility}${path}`,
        );
        return [accepted.status, write.status, wrongOrganization.status];
      },
      { base: API_BASE_URL, organization: E2E_ORGANIZATION_ID, facility: E2E_FACILITY_ID, suffix },
    );
    expect(results).toEqual([200, 404, 404]);
    await expect
      .poll(
        () => info.errors.filter((error) => error.message?.includes('Hermetic safety net')).length,
      )
      .toBe(2);
    test.fail(true, 'Verified exact read success plus both intended safety-net rejections.');
  });
}

test('rejects unrelated plan attachment downloads and implicit list writes', async ({
  page,
}, info) => {
  const plan = facilityAttachmentOutput();
  await new ApiMock(page).mockFacilityPlans(E2E_FACILITY_ID, [plan]);
  const results = await page.evaluate(
    async ({ facility, attachment }) => {
      const download = `/api/facility-attachments/${attachment}/download`;
      const listed = await fetch(`/api/facilities/${facility}/attachments?kind=floor_plan`);
      const accepted = await fetch(download);
      const wrongId = await fetch('/api/facility-attachments/unknown/download');
      const write = await fetch(download, { method: 'POST' });
      const listWrite = await fetch(`/api/facilities/${facility}/attachments`, { method: 'PATCH' });
      return [listed.status, accepted.status, wrongId.status, write.status, listWrite.status];
    },
    { facility: E2E_FACILITY_ID, attachment: plan.id },
  );
  expect(results).toEqual([200, 200, 404, 404, 404]);
  await expect
    .poll(
      () => info.errors.filter((error) => error.message?.includes('Hermetic safety net')).length,
    )
    .toBe(3);
  test.fail(true, 'Verified attachment read fixtures reject all three unregistered requests.');
});

test('scopes facility intervention preview by exact organization, site and GET', async ({
  page,
}, info) => {
  await new ApiMock(page).mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  const results = await page.evaluate(
    async ({ organization, facility }) => {
      const target = `/api/interventions?organization=/api/organizations/${organization}&site=/api/facilities/${facility}`;
      const accepted = await fetch(target);
      const wrongSite = await fetch(target.replace(facility, 'wrong-site'));
      const wrongOrganization = await fetch(target.replace(organization, 'wrong-org'));
      const write = await fetch(target, { method: 'POST' });
      return [accepted.status, wrongSite.status, wrongOrganization.status, write.status];
    },
    { organization: E2E_ORGANIZATION_ID, facility: E2E_FACILITY_ID },
  );
  expect(results).toEqual([200, 404, 404, 404]);
  await expect
    .poll(
      () => info.errors.filter((error) => error.message?.includes('Hermetic safety net')).length,
    )
    .toBe(3);
  test.fail(
    true,
    'Verified the scoped preview cannot swallow wrong-site, wrong-org or write requests.',
  );
});
