import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { mockMobileVisualWorkspace } from '../support/helpers/mobile-visual-mocks';

test('composes populated visual catalogs and the saved message conversation without backend access', async ({
  page,
}) => {
  await mockMobileVisualWorkspace(page);
  await page.route('http://harness.test/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Catalog harness</p>' }),
  );
  await page.goto('http://harness.test/');
  const catalogs = await page.evaluate(async (organization) => {
    const paths = [
      `/api/organizations/${organization}/teams`,
      `/api/organizations/${organization}/checklists`,
      `/api/organizations/${organization}/calendar/feed`,
      `/api/saved-messages?organization=${organization}`,
      '/api/conversations/e2e-direct-2',
    ];
    return Promise.all(paths.map(async (path) => (await fetch(path)).json()));
  }, E2E_ORGANIZATION_ID);
  expect(catalogs[0].member[0].memberCount).toBe(12);
  expect(catalogs[1].member[0].items).toHaveLength(2);
  expect(catalogs[2].items).toHaveLength(1);
  expect(new Date(catalogs[2].items[0].startsAt).getHours()).toBe(12);
  expect(catalogs[3].member[0].isSaved).toBe(true);
  expect(catalogs[4].organization).toBe(`/api/organizations/${E2E_ORGANIZATION_ID}`);
});
