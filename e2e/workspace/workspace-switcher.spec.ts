import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

/**
 * Workspace switcher — the sidebar header that replaced the 60px organization
 * rail (`OrganizationSwitcher`,
 * `src/app/features/organization/ui/components/organization-switcher`).
 *
 * The switcher doubles as the sidebar's title: it shows the active
 * organization and, for a member of more than one, opens a popover to switch
 * or to create one. With a single organization the trigger is not offered at
 * all — there is nothing to switch to.
 */
test.describe('Workspace switcher', () => {
  const organizationA = organizationOutput();
  const organizationB = organizationOutput({
    '@id': '/api/organizations/e2e-org-2',
    id: 'e2e-org-2',
    name: 'Nord Industries',
    slug: 'nord-industries',
  });

  test('shows the active organization as the trigger label', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organizationA, organizationB] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizationA.id);

    const trigger = workspace.sidebar.getByTestId('organization-switcher');
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText(organizationA.name);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('lists every organization in the popover and marks the active one', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organizationA, organizationB] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizationA.id);

    await workspace.sidebar.getByTestId('organization-switcher').click();

    // PrimeNG's Popover defaults to `appendTo="body"`, so the panel is not a
    // descendant of the sidebar — queried from `page`, not `workspace.sidebar`.
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveCount(2);

    // Selection is announced, not just coloured — colour alone never conveys
    // state (PRODUCT.md).
    await expect(menu.getByRole('menuitem', { name: organizationA.name })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(menu.getByRole('menuitem', { name: organizationB.name })).not.toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('switches to another organization', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organizationA, organizationB] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizationA.id);

    await workspace.sidebar.getByTestId('organization-switcher').click();
    await page.getByRole('menuitem', { name: organizationB.name }).click();

    await expect(page).toHaveURL(`/organizations/${organizationB.id}`);
  });

  test('preserves a shared section when switching organizations', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organizationA, organizationB] });
    await api.mockInterventionList([]);

    const workspace = new WorkspacePage(page);
    await page.goto(`/organizations/${organizationA.id}/interventions`);
    await workspace.shell.waitFor({ state: 'visible' });

    await workspace.sidebar.getByTestId('organization-switcher').click();
    await page.getByRole('menuitem', { name: organizationB.name }).click();

    // Only the first path segment is carried over, and only because
    // `interventions` is a section every organization has — the member stays
    // on the same area instead of landing back on the bare organization root.
    await expect(page).toHaveURL(`/organizations/${organizationB.id}/interventions`);
  });

  test('drops a non-shared section when switching organizations', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organizationA, organizationB] });

    const workspace = new WorkspacePage(page);
    await page.goto(`/organizations/${organizationA.id}/saved`);
    await expect(page.getByTestId('saved-messages')).toBeVisible();

    await workspace.sidebar.getByTestId('organization-switcher').click();
    await page.getByRole('menuitem', { name: organizationB.name }).click();

    // `saved` is a collaboration destination, not one of the shared
    // organization navigation items, so nothing beyond the organization root
    // is portable — a deeper path names something that belongs to the
    // organization being left.
    await expect(page).toHaveURL(`/organizations/${organizationB.id}`);
  });

  test('offers organization creation from the switcher', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organizationA, organizationB] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizationA.id);

    await workspace.sidebar.getByTestId('organization-switcher').click();
    await page.getByTestId('organization-switcher-create').click();

    // The switcher's own target is `/onboarding` (`createOrganization()`), but
    // a member reaching this shell has necessarily already completed
    // onboarding — `onboardingRequiredGuard` would not have let them in
    // otherwise — and `onboardingGuard` immediately bounces a completed
    // member back to their default workspace. The round trip lands exactly
    // where it started rather than staying on the wizard.
    await expect(page).toHaveURL(`/organizations/${organizationA.id}`);
    await expect(workspace.shell).toBeVisible();
  });

  test('hides the switcher and shows a plain label with a single organization', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organizationA] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organizationA.id);

    // Nothing suggests a choice that does not exist: no trigger, no popover,
    // just the organization name.
    await expect(workspace.sidebar.getByTestId('organization-switcher')).toHaveCount(0);
    await expect(workspace.sidebar).toContainText(organizationA.name);
  });
});
