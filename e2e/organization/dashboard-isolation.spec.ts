import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, organizationOutput } from '../support/fixtures/api-fixtures';
import {
  organizationDashboardOutput,
  organizationDashboardRecentInterventionOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
} from '../support/fixtures/dashboard-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

test('clears every dashboard panel and intervention link while another organization loads', async ({
  page,
}) => {
  const betaId = 'beta-organization';
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({
    organizations: [
      organizationOutput({ name: 'Alpha organization' }),
      organizationOutput({ id: betaId, name: 'Beta organization' }),
    ],
  });
  await Promise.all(
    [
      [E2E_ORGANIZATION_ID, 'Alpha'],
      [betaId, 'Beta'],
    ].map(([id, label]) =>
      Promise.all([
        api.mockOrganizationDashboard(
          id,
          organizationDashboardOutput({
            recentInterventions: [
              organizationDashboardRecentInterventionOutput({
                id: `${label}-intervention`,
                name: `${label} confidential intervention`,
              }),
            ],
          }),
        ),
        api.mockDashboardInspectionsTrend(id, inspectionsTrendOutput()),
        api.mockDashboardNonConformitiesOpenedTrend(id, nonConformitiesOpenedTrendOutput()),
        api.mockDashboardNonConformitiesResolvedTrend(id, nonConformitiesResolvedTrendOutput()),
        api.mockDashboardEquipmentCreatedTrend(id, equipmentCreatedTrendOutput()),
        api.mockDashboardFacilitiesCreatedTrend(id, facilitiesCreatedTrendOutput()),
      ]),
    ),
  );
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}`);
  await expect(page.getByRole('link', { name: 'Alpha confidential intervention' })).toBeVisible();
  await page.getByTestId('org-dashboard-additional').click();
  await expect(
    page.getByTestId('org-statistics-chart-equipment').locator('tanstack-chart svg'),
  ).toBeVisible();
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let heldReads = 0;
  await page.route(
    new RegExp(`/api/organizations/${betaId}/dashboard(?:[/?]|$)`),
    async (route) => {
      heldReads++;
      await held;
      await route.fallback();
    },
  );
  await page.locator('#organization-switcher-trigger').click();
  await page
    .getByTestId('organization-switcher-list')
    .getByRole('menuitem', { name: /Beta organization/ })
    .click();
  try {
    await expect(page).toHaveURL(new RegExp(`/organizations/${betaId}$`));
    await expect.poll(() => heldReads).toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'Alpha confidential intervention' })).toHaveCount(
      0,
    );
    await expect(page.locator(`a[href*="${betaId}"][href*="Alpha-intervention"]`)).toHaveCount(0);
    await expect(
      page.getByTestId('org-statistics-chart-inspections').locator('tanstack-chart svg'),
    ).toHaveCount(0);
    await expect(
      page.getByTestId('org-statistics-chart-equipment').locator('tanstack-chart svg'),
    ).toHaveCount(0);
    await page.screenshot({
      path: 'e2e/artifacts/corrections/dashboard-beta-loading.png',
      animations: 'disabled',
    });
  } finally {
    release?.();
  }
  await expect(page.getByRole('link', { name: 'Beta confidential intervention' })).toHaveAttribute(
    'href',
    `/organizations/${betaId}/interventions/Beta-intervention`,
  );
  await expect(page.getByRole('link', { name: 'Alpha confidential intervention' })).toHaveCount(0);
});

test('keeps the risk skeleton inside its panel at 360px while the dashboard is delayed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/organizations\/[^/]+\/dashboard(?:[/?]|$)/, async (route) => {
    await held;
    await route.fulfill({ json: organizationDashboardOutput() });
  });
  try {
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}`);
    const panel = page.getByTestId('org-dashboard-risk');
    await expect(panel.locator('hlm-skeleton').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const overflows = await panel.evaluate((element) =>
      [element, ...element.querySelectorAll<HTMLElement>('*')]
        .filter(
          (item) =>
            item instanceof HTMLElement &&
            item.clientWidth > 0 &&
            item.scrollWidth > item.clientWidth + 1,
        )
        .map((item) => ({ tag: item.tagName, overflow: item.scrollWidth - item.clientWidth })),
    );
    expect(overflows).toEqual([]);
    await panel.screenshot({
      path: 'e2e/artifacts/corrections/dashboard-risk-skeleton-360.png',
      animations: 'disabled',
    });
  } finally {
    release?.();
  }
});
