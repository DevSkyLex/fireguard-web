import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_MEMBER_IRI, interventionOutput } from '../support/fixtures/intervention-fixtures';
import { organizationMemberOutput } from '../support/fixtures/member-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

for (const mode of [
  { width: 390, dark: false },
  { width: 1440, dark: true },
]) {
  test(`retains a partial assignment and retries only the failed intervention at ${mode.width}px`, async ({
    page,
    context,
    baseURL,
  }) => {
    if (mode.dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const first = interventionOutput({
      id: 'assign-first',
      name: 'Roof inspection',
      responsible: null,
    });
    const second = interventionOutput({
      id: 'assign-second',
      name: 'Basement inspection',
      responsible: null,
    });
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [first, second]);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
    const sent: string[] = [];
    let fail = true;
    await page.route(/\/api\/interventions\/assign-(first|second)(?:\?.*)?$/, async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      const isSecond = route.request().url().includes('assign-second');
      sent.push(isSecond ? second.id : first.id);
      await route.fulfill({
        status: isSecond && fail ? 409 : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          isSecond && fail
            ? {
                '@type': 'Error',
                title: 'Conflict',
                detail: 'This intervention changed. Reload and retry.',
              }
            : { ...(isSecond ? second : first), responsible: E2E_MEMBER_IRI, revision: 2 },
        ),
      });
    });
    const collection = new InterventionsPage(page);
    await collection.goto(E2E_ORGANIZATION_ID);
    await collection.selectRow(first.name);
    await collection.selectRow(second.name);
    await collection.openBulkActions();
    await page.getByTestId('interventions-bulk-assign').click();
    await page.setViewportSize({ width: mode.width, height: 900 });
    const dialog = page.getByTestId('intervention-assign-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input#intervention-assign-member').fill('Ella');
    await page.getByRole('option', { name: /Ella Uzer/ }).click();
    await page.getByTestId('intervention-assign-submit').click();
    await expect(page.getByTestId('intervention-assign-errors')).toContainText(second.name);
    await expect(dialog.locator('input#intervention-assign-member')).toHaveValue('Ella Uzer');
    await expect(page.getByTestId('intervention-assign-submit')).toBeEnabled();
    await expectNoHorizontalOverflow(page);
    await mkdir('test-results/assignment-captures', { recursive: true });
    await page.screenshot({
      path: `test-results/assignment-captures/assignment-${mode.width}.png`,
      animations: 'disabled',
    });
    fail = false;
    sent.length = 0;
    await page.getByTestId('intervention-assign-submit').click();
    await expect(dialog).toBeHidden();
    expect(sent).toEqual([second.id]);
  });
}

test('resolves a current responsible outside the first catalogue page', async ({ page }) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const iri = `/api/organizations/${E2E_ORGANIZATION_ID}/members/member-102`;
  const item = interventionOutput({
    id: 'selected-remote',
    name: 'Remote responsible',
    responsible: iri,
  });
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [item]);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
  await page.route(/\/api\/organizations\/[^/]+\/members\/member-102(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        organizationMemberOutput({
          id: 'member-102',
          displayName: 'Zoe Remote',
          firstName: 'Zoe',
          lastName: 'Remote',
        }),
      ),
    });
  });
  const collection = new InterventionsPage(page);
  await collection.goto(E2E_ORGANIZATION_ID);
  await collection.row(item.name).getByTestId('intervention-table-row-menu').click();
  await page.getByTestId('intervention-table-row-assign').click();
  const dialog = page.getByTestId('intervention-assign-dialog');
  await expect(dialog.locator('input#intervention-assign-member')).toHaveValue('Zoe Remote');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
