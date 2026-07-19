import { expect, test, type Page, type Request } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * Deleting an organization from the danger zone.
 *
 * This suite exists because the feature shipped broken and nothing caught it:
 * the dialog made the user retype the slug, validated it locally, then threw it
 * away, so every deletion came back 422. Unit tests could not see it — they
 * asserted against a mocked service, and the mock was happy to be called
 * without the confirmation.
 *
 * So the assertion here is on the **request that actually left the browser**.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

async function openDangerZone(page: Page): Promise<{ slug: string; requests: Request[] }> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  const requests: Request[] = [];
  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}**`, async (route) => {
    if (route.request().method() === 'DELETE') {
      requests.push(route.request());
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fallback();
  });

  // The danger zone is still a `?tab=` section of the general settings page;
  // promoting it to its own guarded route is separate, later work.
  await page.goto(`/organizations/${organization.id}/settings/general?tab=danger`);
  await expect(page.locator('app-organization-danger-zone')).toBeVisible();

  return { slug: organization.slug, requests };
}

test.describe('Delete organization', () => {
  test('sends the retyped slug as the confirmation the backend requires', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { slug, requests } = await openDangerZone(page);

    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox').fill(slug);
    await dialog.getByRole('button', { name: /delete/i }).click();

    await expect.poll(() => requests.length).toBeGreaterThan(0);

    // The whole point: without `?slug=`, the backend answers 422 and the
    // organization is never deleted.
    expect(new URL(requests[0]?.url() ?? '').searchParams.get('slug')).toBe(slug);
  });

  test('keeps the confirm button disabled until the slug matches', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { slug } = await openDangerZone(page);

    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    const confirm = dialog.getByRole('button', { name: /delete/i });

    await expect(confirm).toBeDisabled();

    await dialog.getByRole('textbox').fill(`${slug}-not-quite`);
    await expect(confirm).toBeDisabled();

    await dialog.getByRole('textbox').fill(slug);
    await expect(confirm).toBeEnabled();
  });
});
