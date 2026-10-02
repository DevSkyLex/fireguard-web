import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { AuthPages } from '../support/pages/auth.page';
import {
  LiveBrowserApi,
  members,
  object,
  requiredEnvironment,
  revision,
  text,
  type JsonObject,
} from './live-api.helper';

test('A real browser refreshes its session and publishes facility, equipment and inspection drafts through the live workers', async ({
  page,
  context,
}, testInfo) => {
  const apiUrl = requiredEnvironment('FG_LIVE_API_URL');
  const apiOrigin = new URL(apiUrl).origin;
  const webOrigin = new URL(requiredEnvironment('FG_LIVE_WEB_URL')).origin;
  const runId = requiredEnvironment('FG_LIVE_RUN_ID');
  const ledger: { method: string; path: string; status: number }[] = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === apiOrigin)
      ledger.push({
        method: response.request().method(),
        path: url.pathname,
        status: response.status(),
      });
  });
  const auth = new AuthPages(page);
  await auth.gotoLogin();
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url() === new URL('/api/auth/login', apiUrl).href &&
      response.request().method() === 'POST',
  );
  await auth.login(requiredEnvironment('FG_LIVE_EMAIL'), requiredEnvironment('FG_LIVE_PASSWORD'));
  const login = await loginResponse;
  expect(login.status()).toBe(200);
  expect((await login.allHeaders())['access-control-allow-origin']).toBe(webOrigin);
  expect((await login.allHeaders())['access-control-allow-credentials']).toBe('true');
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/);
  const cookieBefore = (await context.cookies(apiUrl)).find(
    (cookie) => cookie.httpOnly && cookie.name.startsWith('__Host-'),
  );
  expect(
    cookieBefore,
    'A Secure HttpOnly host-only refresh cookie must be stored by the browser',
  ).toBeDefined();
  expect(cookieBefore?.secure).toBe(true);
  expect(cookieBefore?.sameSite).toBe('Strict');
  expect(cookieBefore?.path).toBe('/');

  const refreshResponse = page.waitForResponse(
    (response) =>
      response.url() === new URL('/api/auth/refresh', apiUrl).href &&
      response.request().method() === 'POST',
  );
  await page.reload();
  const refresh = await refreshResponse;
  expect(refresh.status()).toBe(200);
  expect((await refresh.allHeaders())['access-control-allow-origin']).toBe(webOrigin);
  const session = object(await refresh.json());
  const accessToken = text(session, 'access_token');
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/);
  const cookieAfter = (await context.cookies(apiUrl)).find(
    (cookie) => cookie.name === cookieBefore?.name,
  );
  expect(cookieAfter?.value !== cookieBefore?.value, 'Refresh must rotate the cookie').toBe(true);
  const api = new LiveBrowserApi(page, apiUrl, accessToken);
  const me = await api.json('GET', '/api/me', 200);
  const userId = text(me, 'id');
  const organization = await api.json('POST', '/api/organizations', 201, {
    name: `Live integration ${runId}`,
  });
  const organizationId = text(organization, 'id');
  const organizationIri = `/api/organizations/${organizationId}`;
  const memberList = members(await api.json('GET', `${organizationIri}/members`, 200));
  expect(memberList).toHaveLength(1);
  const memberId = text(object(memberList[0]), 'id');
  const memberIri = `${organizationIri}/members/${memberId}`;
  const site = await api.json('POST', '/api/facilities', 201, {
    organization: organizationIri,
    type: 'site',
    name: `Live site ${runId}`,
  });
  const siteId = text(site, 'id');
  expect(site['recordStatus']).toBe('published');
  let intervention = await api.json('POST', '/api/interventions', 201, {
    organization: organizationIri,
    type: 'site_setup',
    name: `Live publication ${runId}`,
    site: `/api/facilities/${siteId}`,
    responsible: memberIri,
    participants: [memberIri],
  });
  const interventionId = text(intervention, 'id');
  const interventionIri = `/api/interventions/${interventionId}`;
  expect(intervention['status']).toBe('draft');
  const building = await api.json('POST', '/api/facilities', 201, {
    organization: organizationIri,
    intervention: interventionIri,
    type: 'building',
    name: `Live building ${runId}`,
    parentFacilityId: siteId,
  });
  const buildingId = text(building, 'id');
  const equipment = await api.json('POST', '/api/equipment', 201, {
    organization: organizationIri,
    intervention: interventionIri,
    facility: `/api/facilities/${buildingId}`,
    type: 'fire_extinguisher',
    serialNumber: `LIVE-${runId}`,
    brand: 'Integration fixture',
  });
  const equipmentId = text(equipment, 'id');
  const inspection = await api.json('POST', '/api/inspections', 201, {
    organization: organizationIri,
    intervention: interventionIri,
    equipmentId,
    result: 'pass',
    performedAt: new Date().toISOString(),
    inspectorType: 'user',
    inspectorName: 'Live integration inspector',
    inspectorUserId: userId,
    facilityId: buildingId,
  });
  const inspectionId = text(inspection, 'id');
  for (const draft of [building, equipment, inspection]) {
    expect(draft['recordStatus']).toBe('draft');
    expect(draft['intervention']).toBe(interventionIri);
  }
  const bytes = '%PDF-1.4\nLive API integration evidence\n%%EOF\n';
  const attachment = await api.upload(`/api/inspections/${inspectionId}/attachments`, bytes);
  expect(attachment['inspectionId']).toBe(inspectionId);
  expect(attachment['fileName']).toBe('live-evidence.pdf');
  expect(attachment['size']).toBe(Buffer.byteLength(bytes));
  expect(await api.download(text(attachment, 'contentUrl'))).toBe(bytes);

  const subscription = await api.json('GET', '/api/notifications/subscription', 200);
  expect(subscription['topic']).toBe(`/users/${userId}/notifications`);
  await api.subscribe(
    requiredEnvironment('FG_LIVE_MERCURE_URL'),
    text(subscription, 'topic'),
    text(subscription, 'token'),
  );
  let notification: JsonObject | undefined;
  try {
    // Draft creation can change the intervention revision; reload it before optimistic writes.
    intervention = await api.json('GET', interventionIri, 200);
    const start = new Date(Date.now() + 3_600_000).toISOString().replace(/\.\d{3}Z$/, '+00:00');
    const due = new Date(Date.now() + 86_400_000).toISOString().replace(/\.\d{3}Z$/, '+00:00');
    intervention = await api.json(
      'PATCH',
      interventionIri,
      200,
      { status: 'planned', plannedStartAt: start, dueAt: due },
      revision(intervention),
    );
    expect(intervention['status']).toBe('planned');
    intervention = await api.json(
      'PATCH',
      interventionIri,
      200,
      { status: 'in_progress' },
      revision(intervention),
    );
    expect(intervention['status']).toBe('in_progress');
    intervention = await api.json(
      'PATCH',
      interventionIri,
      200,
      { status: 'submitted' },
      revision(intervention),
    );
    expect(intervention['status']).toBe('submitted');
    const publication = await api.json('POST', '/api/publications', 202, {
      intervention: interventionIri,
      interventionRevision: revision(intervention),
    });
    const publicationId = text(publication, 'id');
    expect(publication['intervention']).toBe(interventionIri);
    await expect
      .poll(
        async () => {
          const current = await api.json('GET', `/api/publications/${publicationId}`, 200);
          if (current['status'] === 'failed') throw new Error('Live worker publication failed.');
          return current['status'];
        },
        { timeout: 60_000, intervals: [250, 500, 1_000] },
      )
      .toBe('completed');
    expect((await api.json('GET', interventionIri, 200))['status']).toBe('published');
    const publishedResources = await Promise.all(
      [
        `/api/facilities/${buildingId}`,
        `/api/equipment/${equipmentId}`,
        `/api/inspections/${inspectionId}`,
      ].map((path) => api.json('GET', path, 200)),
    );
    for (const published of publishedResources) {
      expect(published['recordStatus']).toBe('published');
      expect(published['intervention']).toBe(interventionIri);
    }
    expect(await api.download(text(attachment, 'contentUrl'))).toBe(bytes);
    await expect
      .poll(
        async () => {
          const notifications = members(
            await api.json(
              'GET',
              `/api/notifications?organization=${organizationId}&type=intervention.published`,
              200,
            ),
          );
          notification = notifications.find(
            (entry) => object(entry['payload'])['interventionId'] === interventionId,
          );
          return notification !== undefined;
        },
        { timeout: 60_000, intervals: [250, 500, 1_000] },
      )
      .toBe(true);
    expect(notification?.['organizationId']).toBe(organizationId);
    expect(notification?.['type']).toBe('intervention.published');
    if (!notification) throw new Error('The durable published notification was not found.');
    await api.expectNotification(text(notification, 'id'));
  } finally {
    await api.unsubscribe();
    await testInfo.attach('live-api-request-ledger', {
      body: JSON.stringify({ runId, requests: ledger }, null, 2),
      contentType: 'application/json',
    });
    await testInfo.attach('infrastructure-readiness', {
      body: await readFile(requiredEnvironment('FG_LIVE_READINESS_FILE')),
      contentType: 'application/json',
    });
  }

  // Read the persisted result through the actual Angular facility route as well as the transport.
  await page.goto(`/organizations/${organizationId}/facilities/${buildingId}`);
  await expect(page.locator('#facility-detail')).toBeVisible();
  await expect(page.getByText(`Live building ${runId}`, { exact: true }).first()).toBeVisible();
});
