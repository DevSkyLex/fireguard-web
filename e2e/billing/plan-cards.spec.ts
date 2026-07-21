import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The plan comparison cards on `/billing`.
 *
 * `tagline` and `perks` have always been on `PlanOutput` server-side — the
 * frontend model simply never declared them, so configured copy was fetched
 * and thrown away. This suite pins that both now reach the card, and that a
 * plan without a tagline still lines its price up with the others: a
 * comparison grid whose rows drift reads as broken, not as "no tagline here".
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const plan = (
  id: string,
  name: string,
  sortOrder: number,
  extra: Record<string, unknown> = {},
) => ({
  '@id': `/api/plans/${id}`,
  '@type': 'Plan',
  id,
  key: id,
  name,
  description: null,
  tagline: null,
  perks: [],
  limits: {},
  quotas: [{ resource: 'facility', label: 'Sites', limit: 5, summary: '5 sites' }],
  isActive: true,
  isDefault: sortOrder === 0,
  sortOrder,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...extra,
});

const PLANS = [
  plan('free', 'Free', 0),
  plan('pro', 'Pro', 1, {
    tagline: 'Everything a growing estate needs',
    perks: ['Priority support', 'Compliance exports'],
  }),
];

async function landOnBilling(page: Page): Promise<void> {
  const organization = organizationOutput();
  const api = new ApiMock(page);

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  const org = `${API_BASE_URL}/api/organizations/${organization.id}`;

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
  await page.route(`${API_BASE_URL}/api/plans**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: PLANS, totalItems: PLANS.length }),
    }),
  );

  await page.goto(`/organizations/${organization.id}/billing`);
  await expect(page.locator('#organization-billing')).toBeVisible();
}

test.describe('Plan comparison cards', () => {
  test('renders the configured tagline and perks', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await landOnBilling(page);

    await expect(page.getByText('Everything a growing estate needs')).toBeVisible();

    const perks = page.getByTestId('plan-perk');
    await expect(perks).toHaveCount(2);
    await expect(perks.first()).toContainText('Priority support');
    await expect(perks.nth(1)).toContainText('Compliance exports');
  });

  // The card without a tagline reserves the line rather than closing the gap,
  // so both prices sit on the same row.
  test('keeps the price rows aligned when one plan has no tagline', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await landOnBilling(page);

    const taglines = page.getByTestId('plan-tagline');
    await expect(taglines).toHaveCount(2);
    await expect(taglines.first()).toHaveText('');

    const tops = await taglines.evaluateAll((nodes: Element[]) =>
      nodes.map((node: Element) => Math.round(node.getBoundingClientRect().bottom)),
    );
    expect(Math.abs(tops[0] - tops[1])).toBeLessThanOrEqual(1);
  });
});
