import { expect, type Page, type TestInfo } from '@playwright/test';
import { organizationOutput } from '../fixtures/api-fixtures';
import { workspaceOptions } from '../fixtures/workspace-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { AccountOrganizationsPage } from '../pages/account-organizations.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Covers server-confirmed departure, refresh retry and both post-departure destinations. */
export async function verifyMembershipTransitions(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  const first = organizationOutput({ ownerUserId: 'another-owner', isOwner: false });
  const second = organizationOutput({
    id: 'e2e-organization-second',
    name: 'Second workspace',
    ownerUserId: 'another-owner',
    isOwner: false,
  });
  await api.mockAuthenticatedSession({ organizations: [first, second] });
  await api.mockWorkspaceOptions(() =>
    workspaceOptions({ organizations: [], invitations: [], requests: [] }),
  );
  let organizations = [first, second];
  let failRefresh = false;
  let deletions = 0;
  await page.route(/\/api\/organizations(?:\?.*)?$/, async (route) => {
    if (failRefresh) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: organizations, totalItems: organizations.length }),
    });
  });
  await page.route(/\/api\/organizations\/[^/]+\/members\/me$/, async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    const id = new URL(route.request().url()).pathname.split('/')[3];
    organizations = organizations.filter((organization) => organization.id !== id);
    deletions++;
    failRefresh = deletions === 1;
    await route.fulfill({ status: 204 });
  });
  const account = new AccountOrganizationsPage(page);
  await account.goto();
  await account.startLeaving('E2E Organization');
  await account.confirmLeave();
  await expect(account.leaveDialog).toContainText('You have left the organization.');
  await expect(account.leaveDialog).toBeVisible();
  await expect(page).toHaveURL(/account\/organizations/);
  const refresh = account.leaveDialog.getByRole('button', { name: 'Refresh access', exact: true });
  const capture = `e2e/artifacts/reliability/membership-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${capture}-refresh.png`, animations: 'disabled', fullPage: true });
  failRefresh = false;
  await refresh.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/organizations\/select$/);
  expect(deletions).toBe(1);
  await expect(page.getByRole('link', { name: 'Second workspace', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'E2E Organization', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${capture}-selector.png`,
    animations: 'disabled',
    fullPage: true,
  });
  await account.goto();
  await account.startLeaving('Second workspace');
  await account.confirmLeave();
  await expect(page).toHaveURL(/onboarding\/workspace$/);
  await expect(page.getByRole('heading', { name: 'Your workspace', exact: true })).toBeVisible();
  expect(deletions).toBe(2);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${capture}-workspace.png`,
    animations: 'disabled',
    fullPage: true,
  });
}
