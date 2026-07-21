import { expect, test, type Page, type Request } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * Suspending and reactivating an organization from the danger zone.
 *
 * Suspension used to be an unlabelled toggle inside the General settings form,
 * saved silently alongside the name and the description. The backend maps
 * `isActive: false` onto its `suspended` status, so the action was always
 * available — it was just presented as a preference rather than as cutting off
 * every member of the workspace.
 *
 * The assertion is on the **request body that actually left the browser**: the
 * API has no status field to PATCH, and a card that sent the wrong shape would
 * still render perfectly.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

async function openDangerZone(
  page: Page,
  status: 'active' | 'suspended' | 'archived' = 'active',
): Promise<Request[]> {
  const organization = { ...organizationOutput(), status, isActive: status === 'active' };
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  const patches: Request[] = [];
  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}**`, async (route) => {
    if (route.request().method() === 'PATCH') {
      patches.push(route.request());
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({ ...organization, status: 'suspended', isActive: false }),
      });
      return;
    }
    await route.fallback();
  });

  await page.goto(`/organizations/${organization.id}/settings/danger`);
  await expect(page.locator('app-organization-danger-zone')).toBeVisible();

  return patches;
}

test.describe('Suspend organization', () => {
  // Cutting off every member at once is not something a stray click should do.
  test('sends nothing until the confirmation is accepted', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const patches = await openDangerZone(page);

    await page.getByTestId('organization-suspend-button').click();

    const dialog = page.getByRole('alertdialog', { name: 'Suspend organization' });
    await expect(dialog).toContainText('Every member loses access');
    expect(patches).toHaveLength(0);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    expect(patches).toHaveLength(0);
  });

  // The API exposes no status field: `isActive: false` is what it turns into
  // `suspended`. A card sending `{ status: 'suspended' }` would look identical
  // and change nothing.
  test('patches isActive false once confirmed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const patches = await openDangerZone(page);

    await page.getByTestId('organization-suspend-button').click();
    await page
      .getByRole('alertdialog', { name: 'Suspend organization' })
      .getByRole('button', { name: 'Suspend' })
      .click();

    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]?.postDataJSON()).toEqual({ isActive: false });
  });

  // Restoring access is not destructive, so it does not deserve an interruption.
  test('reactivates without a confirmation step', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const patches = await openDangerZone(page, 'suspended');

    await page.getByTestId('organization-reactivate-button').click();

    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]?.postDataJSON()).toEqual({ isActive: true });
  });

  // The backend rejects suspending an archived organization, so the card must
  // offer the way back instead of a call that fails.
  test('offers restoration rather than suspension when archived', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDangerZone(page, 'archived');

    await expect(page.getByTestId('organization-suspend-button')).toHaveCount(0);
    await expect(page.getByTestId('organization-reactivate-button')).toBeVisible();
    await expect(page.getByTestId('organization-suspend-card')).toContainText(
      'Restore this organization',
    );
  });
});

test.describe('General settings form', () => {
  // The toggle moved to the danger zone. Leaving it here as well would give the
  // same organization-wide action two controls, one of them unconfirmed.
  test('no longer carries the Active toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const organization = organizationOutput();
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);

    await page.goto(`/organizations/${organization.id}/settings`);

    await expect(page.locator('app-organization-general-form')).toBeVisible();
    await expect(page.locator('p-toggleswitch')).toHaveCount(0);
  });
});
