import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The billing page's invoice history (`/billing`).
 *
 * Invoices are rendered by the plan selector's own billing store. This suite
 * had no coverage before — it pins that they appear on the page, and that only
 * a downloadable invoice offers a download control.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const invoice = (
  id: string,
  number: string,
  amount: number,
  status: string,
  invoicePdf: string | null,
) => ({
  id,
  number,
  status,
  amount,
  currency: 'eur',
  createdAt: '2026-06-01T00:00:00+00:00',
  hostedInvoiceUrl: invoicePdf === null ? null : `https://billing.example/${id}`,
  invoicePdf,
});

async function landOnBilling(page: Page): Promise<void> {
  const organization = organizationOutput();
  const api = new ApiMock(page);

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  const org = `${API_BASE_URL}/api/organizations/${organization.id}`;

  // Everything else the page loads; empty payloads keep the other panels quiet.
  await page.route(`${org}/billing/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/ld+json', body: '{}' }),
  );
  await page.route(`${API_BASE_URL}/api/billing/pricing**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: [], totalItems: 0 }),
    }),
  );

  // Registered AFTER the catch-all: Playwright matches handlers in reverse
  // registration order, so the broad `/billing/**` would otherwise swallow the
  // invoices endpoint.
  await page.route(`${org}/billing/invoices**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          invoice('in_1', 'FG-0001', 4900, 'paid', 'https://billing.example/in_1.pdf'),
          invoice('in_2', 'FG-0002', 4900, 'open', null),
        ],
        totalItems: 2,
      }),
    }),
  );

  await page.goto(`/organizations/${organization.id}/billing`);
  await expect(page.locator('#organization-billing')).toBeVisible();
}

test.describe('Billing invoices', () => {
  test('lists the organization invoices', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOnBilling(page);

    const table = page.locator('app-billing-invoice-table').first();
    await expect(table).toContainText('FG-0001');
    await expect(table).toContainText('FG-0002');
  });

  // Only an invoice with a PDF or hosted URL can be downloaded; the open one
  // here has neither, so it must not offer the control.
  test('offers a download only for a downloadable invoice', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOnBilling(page);

    const table = page.locator('app-billing-invoice-table').first();
    await expect(table.getByRole('button', { name: 'Download invoice' })).toHaveCount(1);
  });

  test('does not push the page sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await landOnBilling(page);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});
