import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import { E2E_MEMBER_IRI, interventionOutput } from '../support/fixtures/intervention-fixtures';
import {
  inspectorOrganizationMemberOutput,
  organizationMemberOutput,
} from '../support/fixtures/member-fixtures';
import { ownerOrganizationRoleOutput } from '../support/fixtures/role-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';
import { OrganizationMembersPage } from '../support/pages/organization-members.page';

async function expectAboveBottomNavigation(page: Page, testId: string): Promise<void> {
  const bar = await page.getByTestId(testId).boundingBox();
  const navigation = await page.locator('#dashboard-mobile-navigation').boundingBox();
  const viewport = page.viewportSize();
  if (!bar || !navigation || !viewport) throw new Error('Mobile bar or navigation is missing.');
  expect(bar.x).toBeGreaterThanOrEqual(0);
  expect(bar.x + bar.width).toBeLessThanOrEqual(viewport.width);
  expect(bar.y + bar.height).toBeLessThan(navigation.y);
  await expectNoHorizontalOverflow(page);
}

async function expectPaginationAboveBar(page: Page, prefix: string): Promise<void> {
  const pageSize = page.getByTestId(`${prefix}-page-size`);
  await pageSize.scrollIntoViewIfNeeded();
  await page.locator('#dashboard-main').evaluate((main: HTMLElement) => {
    main.scrollTop += 120;
  });
  await expect(pageSize).toBeInViewport();
  const pageSizeBox = await pageSize.boundingBox();
  const barBox = await page.getByTestId(`${prefix}-selection-bar`).boundingBox();
  if (!pageSizeBox || !barBox) throw new Error('Pagination or selection bar is missing.');
  expect(pageSizeBox.y + pageSizeBox.height).toBeLessThan(barBox.y);
}

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test('opens intervention actions above the bottom navigation and closes before confirmation', async ({
  page,
}, info) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [
    interventionOutput({
      id: 'selected-mobile-a',
      '@id': '/api/interventions/selected-mobile-a',
      name: 'Selected mobile intervention',
      responsible: E2E_MEMBER_IRI,
      allowedActions: { ...interventionOutput().allowedActions, canDelete: true },
    }),
    interventionOutput({
      id: 'selected-mobile-b',
      '@id': '/api/interventions/selected-mobile-b',
      name: 'Last mobile intervention',
    }),
  ]);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

  const interventions = new InterventionsPage(page);
  await interventions.goto(E2E_ORGANIZATION_ID);
  await page.getByTestId('interventions-tools').click();
  await page.getByTestId('interventions-selection-mode').click();
  await page.getByTestId('interventions-tools-close').click();
  await page
    .getByTestId('intervention-table-card')
    .filter({ hasText: 'Selected mobile intervention' })
    .getByTestId('intervention-table-row-select')
    .click();

  await expect(interventions.selectionBar).toContainText('Selected: 1');
  await expectAboveBottomNavigation(page, 'interventions-selection-bar');
  await expectPaginationAboveBar(page, 'interventions');

  await mkdir('e2e/artifacts/selection-bar', { recursive: true });
  await page.screenshot({
    path: `e2e/artifacts/selection-bar/interventions-${info.project.name.replaceAll(' ', '-')}-light.png`,
    animations: 'disabled',
  });
  const trigger = page.getByTestId('interventions-selection-actions-trigger');
  await trigger.click();
  await expect(page.getByTestId('interventions-selection-drawer')).toBeVisible();
  await expect(page.getByTestId('interventions-selection-drawer')).toContainText('Move to');
  await page.screenshot({
    path: `e2e/artifacts/selection-bar/interventions-${info.project.name.replaceAll(' ', '-')}-drawer.png`,
    animations: 'disabled',
  });
  await page.getByTestId('interventions-selection-action-delete').click();
  await expect(page.getByTestId('interventions-selection-drawer')).toHaveCount(0);
  await expect(page.getByTestId('interventions-delete-dialog')).toBeVisible();
});

test('keeps member removal in its existing confirmation from the compact dark bar', async ({
  page,
  context,
  baseURL,
}, info) => {
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
    organizationMemberOutput(),
    inspectorOrganizationMemberOutput(),
  ]);
  await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);

  const members = new OrganizationMembersPage(page);
  await members.goto(E2E_ORGANIZATION_ID);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('organization-members-selection-mode').click();
  await page
    .getByTestId('organization-member-table-row-card')
    .first()
    .getByTestId('organization-member-table-row-select')
    .click();

  const bar = page.getByTestId('organization-members-selection-bar');
  await expect(bar).toContainText('Selected: 1');
  await expectAboveBottomNavigation(page, 'organization-members-selection-bar');
  await expectPaginationAboveBar(page, 'organization-members');
  await mkdir('e2e/artifacts/selection-bar', { recursive: true });
  await page.screenshot({
    path: `e2e/artifacts/selection-bar/members-${info.project.name.replaceAll(' ', '-')}-dark.png`,
    animations: 'disabled',
  });

  await page.getByTestId('organization-members-selection-actions-trigger').click();
  await expect(page.getByTestId('organization-members-selection-drawer')).toBeVisible();
  await page.getByTestId('organization-members-selection-action-remove').click();
  await expect(page.getByTestId('organization-members-selection-drawer')).toHaveCount(0);
  await expect(members.removeDialog).toBeVisible();
});
