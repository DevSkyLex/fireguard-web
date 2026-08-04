import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

/**
 * Workspace channel sidebar — the organization's business destinations.
 *
 * The section is contributed through `SECONDARY_NAV_SLOT` and reads the
 * feature-owned, permission-filtered navigation configuration
 * (`buildOrganizationNavigationSection`), so what a member may see follows the
 * same RBAC rules as the routes themselves.
 */
test.describe('Workspace sidebar', () => {
  const organization = organizationOutput();

  test('renders the organization header and its settings shortcut', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organization.id);

    await expect(workspace.sidebar).toContainText(organization.name);
    await expect(page.getByTestId('workspace-nav-settings')).toHaveAttribute(
      'href',
      `/organizations/${organization.id}/settings`,
    );
  });

  test('renders destinations as three titled groups', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organization.id);

    const nav = workspace.sidebar.getByRole('navigation', { name: 'Organization' });

    // The grouping used to drive RBAC filtering only, with every destination
    // rendered as one flat list. It now also structures the sidebar into
    // three readable, titled sections instead of eight flat peers.
    const headings = nav.getByRole('heading');
    await expect(headings).toHaveText(['Operations', 'Assets', 'Administration']);

    const operations = nav.locator('ul[aria-labelledby="workspace-nav-group-operations"]');
    await expect(operations.getByRole('link', { name: 'Today' })).toBeVisible();
    await expect(operations.getByRole('link', { name: 'Interventions' })).toBeVisible();
    await expect(operations.getByRole('link', { name: 'Inspections' })).toBeVisible();

    const assets = nav.locator('ul[aria-labelledby="workspace-nav-group-assets"]');
    await expect(assets.getByRole('link', { name: 'Facilities' })).toBeVisible();
    await expect(assets.getByRole('link', { name: 'Equipments' })).toBeVisible();

    // "Team" replaces the earlier "Roles" label.
    const administration = nav.locator('ul[aria-labelledby="workspace-nav-group-administration"]');
    await expect(administration.getByRole('link', { name: 'Members' })).toBeVisible();
    await expect(administration.getByRole('link', { name: 'Team' })).toBeVisible();
    await expect(administration.getByRole('link', { name: 'Roles' })).toHaveCount(0);
    await expect(administration.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('navigates within the shell and marks the open destination', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organization.id);

    const nav = workspace.sidebar.getByRole('navigation', { name: 'Organization' });
    const interventions = nav.getByRole('link', { name: 'Interventions' });

    // Nothing is current while the shell sits on the organization landing.
    await expect(interventions).not.toHaveAttribute('aria-current', 'page');

    await interventions.click();

    await expect(page).toHaveURL(`/organizations/${organization.id}/interventions`);
    await expect(workspace.shell).toBeVisible();
    await expect(interventions).toHaveAttribute('aria-current', 'page');
  });

  test('keeps rows at the prototype 32px rhythm', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organization.id);

    const heights = await workspace.sidebar.evaluate((sidebar: HTMLElement) =>
      Array.from(sidebar.querySelectorAll('app-nav-row a')).map((row: Element) =>
        Math.round(row.getBoundingClientRect().height),
      ),
    );

    expect(heights.length).toBeGreaterThan(0);
    heights.forEach((height: number) => expect(height).toBe(32));
  });
});
