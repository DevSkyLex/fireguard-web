import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import {
  E2E_PERMISSION_CATALOG,
  organizationRoleOutput,
  ownerOrganizationRoleOutput,
} from '../support/fixtures/role-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { expectSheetGuardHolds } from '../support/helpers/sheet-guard';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationTeamPage } from '../support/pages/organization-team.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/92f41712-7d5f-443b-af9a-18c346a39be0/scratchpad/screenshots';

test.describe('Organization team', () => {
  test('renders the role grid with a read-only system role and an editable custom role', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
      ownerOrganizationRoleOutput(),
      organizationRoleOutput(),
    ]);
    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);
    const team = new OrganizationTeamPage(page);

    await team.goto(E2E_ORGANIZATION_ID);

    await expect(team.root).toBeVisible();
    await expect(team.createRoleButton).toBeVisible();
    await expect(team.roleGrid).toBeVisible();
    await expect(team.roleCards).toHaveCount(2);
    await expect(team.roleCards.filter({ hasText: 'System' })).toHaveCount(1);
    // The system role offers no menu — its permissions cannot be edited or deleted.
    await expect(
      team.roleCards.filter({ hasText: 'System' }).getByTestId('organization-role-grid-card-menu'),
    ).toHaveCount(0);
  });

  test('opens the create-role dialog and the permission editor for a custom role', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
      ownerOrganizationRoleOutput(),
      organizationRoleOutput(),
    ]);
    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);
    const team = new OrganizationTeamPage(page);

    await team.goto(E2E_ORGANIZATION_ID);
    await expect(team.roleCards).toHaveCount(2);

    await team.openCreateDialog();
    await expect(team.createDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(team.createDialog).toBeHidden();

    await team.openPermissionsEditorForCard(1);
    await expect(team.permissionsSheet).toBeVisible();
    await expect(team.permissionCheckboxes.first()).toBeVisible();
  });

  test('guards a dirty draft in the create-role dialog', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
      ownerOrganizationRoleOutput(),
      organizationRoleOutput(),
    ]);
    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);
    const team = new OrganizationTeamPage(page);

    await team.goto(E2E_ORGANIZATION_ID);
    await team.openCreateDialog();
    await expect(team.createDialog).toBeVisible();

    await team.createNameInput.click();
    await team.createNameInput.pressSequentially('inspector');
    /*
     * The 36-permission checklist makes this the heaviest form in the
     * catalog to re-render; give Signal Forms' own dirty tracking one frame
     * to settle before Escape, or the guard reads a dirty flag that has not
     * caught up with the last keystroke yet.
     */
    await page.waitForTimeout(100);

    await expectSheetGuardHolds(page, team.createDialog, () => page.keyboard.press('Escape'));
  });

  /*
   * The tallest dialog of the application: its body is the whole permission
   * catalog, so its height is driven by the API rather than by the template.
   * `hlm-dialog-content` ships with neither a `max-h` nor an `overflow`, and
   * the brain centres it with a blocking scroll strategy — unbounded, it is
   * clipped at both ends on a phone and its primary button becomes
   * unreachable. Each call site therefore carries the bound itself
   * (`tools/guards/dialog-height.mjs` keeps them honest); this asserts the
   * effect rather than the class.
   */
  test('the create-role dialog keeps its primary action reachable at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);
    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);
    const team = new OrganizationTeamPage(page);

    await team.goto(E2E_ORGANIZATION_ID);
    await team.openCreateDialog();
    await expect(team.createDialog).toBeVisible();

    const bounds = await team.createDialog.evaluate((element: HTMLElement) => ({
      height: element.getBoundingClientRect().height,
      overflowY: getComputedStyle(element).overflowY,
    }));

    expect(bounds.overflowY, 'the sheet scrolls its own content').toBe('auto');
    expect(bounds.height, 'the sheet fits the viewport').toBeLessThanOrEqual(667);

    const submit = page.getByTestId('organization-role-create-submit');
    await submit.scrollIntoViewIfNeeded();
    await expect(
      submit,
      'the primary action is reachable by scrolling the dialog',
    ).toBeInViewport();
  });

  test('hides "New role" and every role card menu without roles.manage', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ['organization.roles.read'],
    });
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
      ownerOrganizationRoleOutput(),
      organizationRoleOutput(),
    ]);
    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);
    const team = new OrganizationTeamPage(page);

    await team.goto(E2E_ORGANIZATION_ID);

    await expect(team.roleCards).toHaveCount(2);
    await expect(team.createRoleButton).toHaveCount(0);
    await expect(team.roleCardMenu).toHaveCount(0);
  });

  test('renders at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID);
    await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID);
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
      ownerOrganizationRoleOutput(),
      organizationRoleOutput(),
    ]);
    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);
    const team = new OrganizationTeamPage(page);

    await team.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(team.root).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/team-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
      ownerOrganizationRoleOutput(),
      organizationRoleOutput(),
    ]);
    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);
    const team = new OrganizationTeamPage(page);

    await team.goto(E2E_ORGANIZATION_ID);

    await expect(team.root).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/team-light-desktop.png` });
  });
});
