import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import { E2E_MEMBER_IRI, interventionOutput } from '../support/fixtures/intervention-fixtures';
import { organizationMemberOutput } from '../support/fixtures/member-fixtures';
import { ownerOrganizationRoleOutput } from '../support/fixtures/role-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';
import { OrganizationMembersPage } from '../support/pages/organization-members.page';

for (const width of [1440, 780]) {
  test(`anchors intervention selection actions below pagination at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(
      E2E_ORGANIZATION_ID,
      Array.from({ length: 31 }, (_, index) =>
        interventionOutput({
          id: `selected-desktop-${index}`,
          '@id': `/api/interventions/selected-desktop-${index}`,
          name: index === 0 ? 'Selected desktop intervention' : `Additional intervention ${index}`,
          number: 101 + index,
          responsible: E2E_MEMBER_IRI,
        }),
      ),
    );
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

    const interventions = new InterventionsPage(page);
    await interventions.goto(E2E_ORGANIZATION_ID);
    await expect(interventions.tableRows).toHaveCount(30);
    await interventions.selectRow('Selected desktop intervention');
    await expect(interventions.selectionBar).toContainText('1 of 31 selected');

    const pagination = page.getByTestId('interventions-page-size');
    await pagination.scrollIntoViewIfNeeded();
    const paginationBox = await pagination.boundingBox();
    const barBox = await interventions.selectionBar.boundingBox();
    if (!paginationBox || !barBox) throw new Error('Pagination or selection bar is missing.');
    expect(paginationBox.y + paginationBox.height).toBeLessThan(barBox.y);
    expect(900 - (barBox.y + barBox.height)).toBeGreaterThanOrEqual(12);
    expect(900 - (barBox.y + barBox.height)).toBeLessThanOrEqual(24);
    await expectNoHorizontalOverflow(page);

    await mkdir('tests/e2e/artifacts/selection-bar', { recursive: true });
    await page.screenshot({
      path: `tests/e2e/artifacts/selection-bar/interventions-page-bottom-${width}.png`,
      animations: 'disabled',
    });
  });
}

test('keeps the members selection bar and final pagination reachable on a narrow desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 780, height: 700 });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
  await api.mockOrganizationMembers(
    E2E_ORGANIZATION_ID,
    Array.from({ length: 31 }, (_, index) =>
      organizationMemberOutput({
        id: `selection-member-${index}`,
        '@id': `/api/organizations/members/selection-member-${index}`,
      }),
    ),
    { paginate: true },
  );
  await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);
  await api.mockOrganizationJoinRequests(E2E_ORGANIZATION_ID, []);

  const members = new OrganizationMembersPage(page);
  await members.goto(E2E_ORGANIZATION_ID);
  await expect(members.memberRows).toHaveCount(30);
  const bar = page.getByTestId('organization-members-selection-bar');
  await expect(bar).toHaveCount(0);

  await members.memberRows.first().getByTestId('organization-member-table-row-select').click();
  await expect(bar).toContainText('1 of 31 selected');
  await expectNoHorizontalOverflow(page);

  await page.getByTestId('organization-members-tab-requests').click();
  await expect(bar).toHaveCount(0);
  await page.getByTestId('organization-members-tab-members').click();
  await expect(bar).toBeVisible();

  await page.locator('#dashboard-main').evaluate((main: HTMLElement) => {
    main.scrollTop = main.scrollHeight;
  });
  const pagination = members.pageIndicator;
  await pagination.scrollIntoViewIfNeeded();
  await expect(pagination).toBeInViewport();
  const barBox = await bar.boundingBox();
  const paginationBox = await pagination.boundingBox();
  const sidebarBox = await page.locator('[data-slot="sidebar-container"]').boundingBox();
  if (!barBox || !paginationBox || !sidebarBox)
    throw new Error('Selection bar, pagination or sidebar is missing.');
  expect(paginationBox.y + paginationBox.height).toBeLessThan(barBox.y);
  expect(barBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width);
  expect(barBox.x + barBox.width).toBeLessThanOrEqual(780);

  await mkdir('tests/e2e/artifacts/selection-bar', { recursive: true });
  await page.screenshot({
    path: 'tests/e2e/artifacts/selection-bar/members-narrow-desktop-light.png',
    animations: 'disabled',
  });

  await page.getByTestId('organization-members-selection-action-remove').focus();
  await page.keyboard.press('Enter');
  await expect(members.removeDialog).toBeVisible();
  await members.removeDialog.getByRole('button', { name: 'Cancel' }).click();
  await page.locator('#dashboard-main').evaluate((main: HTMLElement) => {
    main.scrollTop = 0;
  });
  await members.memberRows.first().getByTestId('organization-member-table-row-select').click();
  await expect(bar).toHaveCount(0);
});
