import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationTodayPage } from '../support/pages/organization-today.page';

/**
 * Authenticated root landing — `/`.
 *
 * The root has no standalone home page anymore: it forwards to
 * `/organizations`, where `organizationGuard` resolves the user's default
 * workspace (last-organization cookie when set, else the first accessible
 * organization) and redirects to `/organizations/:organizationId`. The full
 * boot burst (refresh -> /api/me -> notifications -> onboarding ->
 * organizations) is mocked so the chain resolves without a live backend.
 */
test.describe('Dashboard home', () => {
  test('lands an authenticated user on their default organization workspace', async ({ page }) => {
    const organization = organizationOutput();
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);

    await page.goto('/');

    // Fresh browser context: no last-organization cookie exists yet, so
    // `organizationGuard` falls back to the first organization of the list.
    await expect(page).toHaveURL(`/organizations/${organization.id}`);
    await expect(new OrganizationTodayPage(page).root).toBeVisible();
  });

  test('returns the user to the last organization they worked in', async ({ page }) => {
    const firstOrganization = organizationOutput();
    const secondOrganization = organizationOutput({
      '@id': '/api/organizations/e2e-org-2',
      id: 'e2e-org-2',
      name: 'E2E Second Organization',
      slug: 'e2e-second-organization',
    });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [firstOrganization, secondOrganization],
    });
    await api.mockOrganizationDetail(firstOrganization);
    await api.mockOrganizationDetail(secondOrganization);
    await api.mockOrganizationAccess(firstOrganization.id);
    await api.mockOrganizationAccess(secondOrganization.id);

    // Working in the SECOND organization persists it as the default workspace
    // (the active-organization store writes the last-organization cookie).
    const todayPage = new OrganizationTodayPage(page);
    await todayPage.goto(secondOrganization.id);
    await expect(todayPage.root).toBeVisible();

    // A later visit to the root lands back on that organization, not the first.
    await page.goto('/');

    await expect(page).toHaveURL(`/organizations/${secondOrganization.id}`);
  });

  test('redirects a user with incomplete onboarding to /onboarding', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ onboarding: { state: 'in_progress' } });

    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('redirects an unauthenticated visitor to the login page', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    await page.goto('/');

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
