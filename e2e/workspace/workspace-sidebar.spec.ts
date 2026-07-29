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

  test('renders destinations as a single flat list', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organization.id);

    const nav = workspace.sidebar.getByRole('navigation', { name: 'Organization' });

    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Interventions' })).toBeVisible();

    // The prototype's business nav is flat: the group headings that used to
    // sit above the destinations (e.g. "Field work") are gone. The grouping
    // still drives RBAC upstream; only the visual headings were dropped.
    await expect(nav.getByRole('heading', { name: 'Field work' })).toHaveCount(0);
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
