import { expect, test } from '@playwright/test';
import { createContractValidator, loadOpenApi } from '../../contracts/support/openapi';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { directConversationOutput } from '../support/fixtures/direct-messages-fixtures';
import { API_BASE_URL, ApiMock } from '../support/mocks/api-mock';

const validator = createContractValidator(loadOpenApi());
const organization = '/api/organizations/' + E2E_ORGANIZATION_ID;
const cases = [
  ['GET', '/api/me'],
  ['GET', '/api/onboarding/organization'],
  ['GET', '/api/organizations'],
  ['GET', '/api/organizations/' + E2E_ORGANIZATION_ID + '/me'],
  ['GET', '/api/notifications'],
  ['GET', '/api/notifications/subscription'],
  ['GET', '/api/inbox'],
  ['GET', '/api/inbox/unread-count'],
  ['GET', '/api/me/presence-preference'],
  ['PATCH', '/api/me/presence-preference'],
  ['GET', '/api/me/presence-preference/subscription'],
  ['POST', '/api/presence/ping'],
  ['GET', '/api/presence?organization=' + E2E_ORGANIZATION_ID + '&memberIds=e2e-member-1'],
  ['GET', '/api/presence/subscription?organization=' + E2E_ORGANIZATION_ID],
  ['GET', '/api/direct-conversations?organization=' + encodeURIComponent(organization)],
  ['GET', '/api/channels?organization=' + E2E_ORGANIZATION_ID],
  ['GET', '/api/interventions?organization=' + encodeURIComponent(organization)],
  ['GET', '/api/maintenance/schedules?organization=' + encodeURIComponent(organization)],
  ['GET', '/api/imports?organization=' + E2E_ORGANIZATION_ID],
  ['GET', '/api/saved-messages?organization=' + E2E_ORGANIZATION_ID],
] as const;

test.beforeEach(async ({ page }) => {
  await page.route(API_BASE_URL + '/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>API contract harness</p>' }),
  );
  await page.goto(API_BASE_URL + '/');
});

for (const [method, path] of cases) {
  test(`SPA fixture conforms to OpenAPI: ${method} ${path}`, async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID);
    await api.mockDirectConversationList([directConversationOutput()]);
    await api.mockInterventionList(E2E_ORGANIZATION_ID);
    await api.mockMaintenanceScheduleList();
    await api.mockImportJobList();
    await api.mockSavedMessages();
    const requestBody =
      method === 'PATCH'
        ? { doNotDisturb: true }
        : method === 'POST'
          ? { organization: E2E_ORGANIZATION_ID }
          : undefined;
    const contentType = method === 'PATCH' ? 'application/merge-patch+json' : 'application/ld+json';
    if (requestBody) validator.request(method, path, contentType, requestBody);
    const response = await page.evaluate(
      async (input) => {
        const result = input.requestBody
          ? await fetch(input.path, {
              method: input.method === 'POST' ? 'POST' : 'PATCH',
              headers: { 'content-type': input.contentType },
              body: JSON.stringify(input.requestBody),
            })
          : await fetch(input.path);
        return {
          status: result.status,
          contentType: result.headers.get('content-type') ?? '',
          body: await result.json(),
        };
      },
      { method, path, requestBody, contentType },
    );
    expect(response.status).toBe(200);
    validator.response(method, path, response.status, response.contentType, response.body);
  });
}
