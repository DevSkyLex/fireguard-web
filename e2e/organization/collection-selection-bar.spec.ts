import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import {
  inspectorOrganizationMemberOutput,
  organizationMemberOutput,
} from '../support/fixtures/member-fixtures';
import { ownerOrganizationRoleOutput } from '../support/fixtures/role-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationMembersPage } from '../support/pages/organization-members.page';

test('keeps the members selection bar and final pagination reachable on a narrow desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 780, height: 700 });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
    organizationMemberOutput(),
    inspectorOrganizationMemberOutput(),
  ]);
  await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);
  await api.mockOrganizationJoinRequests(E2E_ORGANIZATION_ID, []);

  const members = new OrganizationMembersPage(page);
  await members.goto(E2E_ORGANIZATION_ID);
  await expect(members.memberRows).toHaveCount(2);
  const bar = page.getByTestId('organization-members-selection-bar');
  await expect(bar).toHaveCount(0);

  await members.memberRows.first().getByTestId('organization-member-table-row-select').click();
  await expect(bar).toContainText('Selected: 1');
  await expect(bar).toContainText('Results: 2');
  await expectNoHorizontalOverflow(page);

  await page.getByTestId('organization-members-tab-requests').click();
  await expect(bar).toHaveCount(0);
  await page.getByTestId('organization-members-tab-members').click();
  await expect(bar).toBeVisible();

  await page.locator('#dashboard-main').evaluate((main: HTMLElement) => {
    main.scrollTop = main.scrollHeight;
  });
  await expect(members.pageIndicator).toBeInViewport();
  const barBox = await bar.boundingBox();
  const paginationBox = await members.pageIndicator.boundingBox();
  const sidebarBox = await page.locator('[data-slot="sidebar-container"]').boundingBox();
  if (!barBox || !paginationBox || !sidebarBox)
    throw new Error('Selection bar, pagination or sidebar is missing.');
  expect(paginationBox.y + paginationBox.height).toBeLessThan(barBox.y);
  expect(barBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width);
  expect(barBox.x + barBox.width).toBeLessThanOrEqual(780);

  await mkdir('e2e/artifacts/selection-bar', { recursive: true });
  await page.screenshot({
    path: 'e2e/artifacts/selection-bar/members-narrow-desktop-light.png',
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
