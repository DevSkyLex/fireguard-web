import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  organizationDashboardOutput,
  organizationDashboardAlertOutput,
  organizationDashboardRecentInterventionOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
} from '../support/fixtures/dashboard-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * Function prepare
 * @description Loads the real shell with hermetic operational data, including an unknown alert.
 * @access private
 * @since 1.0.0
 * @param {Page} page - Browser page.
 * @returns {Promise<ApiMock>} Mock API for scenario-specific responses.
 */
async function prepare(page: Page): Promise<ApiMock> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationDashboard(
    E2E_ORGANIZATION_ID,
    organizationDashboardOutput({
      alerts: [
        organizationDashboardAlertOutput({ code: 'equipment_under_maintenance', count: 3 }),
        organizationDashboardAlertOutput({ code: 'future_alert', count: 1 }),
        organizationDashboardAlertOutput({ code: 'critical_non_conformities_open', count: 2 }),
      ],
      recentInterventions: Array.from({ length: 5 }, (_, index) =>
        organizationDashboardRecentInterventionOutput({
          id: 'intervention-' + index,
          number: 205 + index,
          name:
            index === 0
              ? 'Replace corridor extinguisher and inspect all equipment across the north building'
              : 'Planned inspection ' + (index + 1),
        }),
      ),
    }),
  );
  await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, inspectionsTrendOutput());
  await api.mockDashboardNonConformitiesOpenedTrend(
    E2E_ORGANIZATION_ID,
    nonConformitiesOpenedTrendOutput(),
  );
  await api.mockDashboardNonConformitiesResolvedTrend(
    E2E_ORGANIZATION_ID,
    nonConformitiesResolvedTrendOutput(),
  );
  await api.mockDashboardEquipmentCreatedTrend(E2E_ORGANIZATION_ID, equipmentCreatedTrendOutput());
  await api.mockDashboardFacilitiesCreatedTrend(
    E2E_ORGANIZATION_ID,
    facilitiesCreatedTrendOutput(),
  );
  return api;
}

for (const width of [1440, 390]) {
  for (const dark of [false, true]) {
    test(
      'balances activity and risk at ' + width + 'px in ' + (dark ? 'dark' : 'light') + ' mode',
      async ({ page, context, baseURL }) => {
        await page.setViewportSize({ width, height: 900 });
        if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
        const errors = collectConsoleErrors(page);
        await prepare(page);
        await page.goto('/organizations/' + E2E_ORGANIZATION_ID);
        const activity = page.getByTestId('org-statistics-chart-inspections');
        const risk = page.getByTestId('org-dashboard-risk');
        await expect(activity.locator('tanstack-chart svg')).toBeVisible();
        await expect(risk.locator('tanstack-chart svg')).toBeVisible();
        await expect(page.getByTestId('org-dashboard-kpi-open-non-conformities')).toContainText(
          '8',
        );
        await expect(page.getByTestId('org-dashboard-kpi-inspections-completed')).not.toContainText(
          'Decrease',
        );
        await expect(risk.getByTestId('donut-chart')).toBeVisible();
        await expect(risk.locator('dl > div')).toHaveCount(4);
        const a = await activity.boundingBox();
        const b = await risk.boundingBox();
        if (!a || !b) throw new Error('Missing chart bounds');
        if (width === 1440) {
          expect(Math.abs(a.width - b.width)).toBeLessThan(2);
          expect(Math.abs(a.y - b.y)).toBeLessThan(2);
          expect(Math.max(a.y + a.height, b.y + b.height)).toBeLessThanOrEqual(900);
        } else {
          expect(b.y).toBeGreaterThan(a.y);
        }
        const alerts = page.getByTestId('org-dashboard-alerts');
        await expect(alerts.locator('[data-slot=item]').first()).toContainText('Critical');
        await expect(alerts.getByRole('link', { name: /future alert/i })).toHaveCount(0);
        const recent = page.getByTestId('org-dashboard-recent');
        if (width === 1440) {
          await expect(recent.getByRole('table')).toHaveAttribute(
            'aria-labelledby',
            'org-dashboard-recent-title',
          );
        }
        await expect(recent.getByRole('link', { name: /Replace corridor/ })).toHaveAttribute(
          'href',
          '/organizations/' + E2E_ORGANIZATION_ID + '/interventions/intervention-0',
        );
        await expectNoHorizontalOverflow(page);
        await page.locator('#dashboard-content').evaluate((el) => (el.scrollTop = 0));
        await page.screenshot({
          path:
            'e2e/artifacts/dashboard-redesign/' + width + '-' + (dark ? 'dark' : 'light') + '.png',
          animations: 'disabled',
        });
        await risk.screenshot({
          path:
            'e2e/artifacts/dashboard-redesign/risk-' +
            width +
            '-' +
            (dark ? 'dark' : 'light') +
            '.png',
          animations: 'disabled',
        });
        await recent.screenshot({
          path:
            'e2e/artifacts/dashboard-redesign/recent-' +
            width +
            '-' +
            (dark ? 'dark' : 'light') +
            '.png',
          animations: 'disabled',
        });
        await activity.locator('tanstack-chart svg').focus();
        await page.keyboard.press('ArrowRight');
        await expect(activity.getByRole('status')).toBeVisible();
        await page.getByTestId('org-dashboard-additional').click();
        await expect(
          page.getByTestId('org-statistics-chart-equipment').locator('tanstack-chart svg'),
        ).toBeVisible();
        await expectNoHorizontalOverflow(page);
        expect(errors).toEqual([]);
      },
    );
  }
}

test('retains the loaded period and data until replacement data arrives', async ({ page }) => {
  const api = await prepare(page);
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID);
  const chart = page.getByTestId('org-statistics-chart-inspections');
  await expect(chart.locator('tanstack-chart svg')).toBeVisible();
  const before = await chart.textContent();
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/dashboard\/trends\/inspections(?:\?|$)/, async (route) => {
    await pending;
    const updated = inspectionsTrendOutput();
    await route.fulfill({ json: { ...updated, summary: { total: 999 } } });
  });
  await page
    .getByTestId('org-statistics-period-toggle')
    .getByRole('button', { name: '90D', exact: true })
    .click();
  await expect(page.getByText('Updating charts… Previous period remains visible.')).toBeVisible();
  await expect(chart.locator('tanstack-chart svg')).toBeVisible();
  try {
    expect(await chart.textContent()).toBe(before);
  } finally {
    release?.();
  }
  await expect(chart).toContainText('999');
  await expect(page.getByTestId('org-dashboard-kpi-open-non-conformities')).toContainText('8');
  await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, inspectionsTrendOutput());
});

test('does not show an infinite comparison against a zero baseline', async ({ page }) => {
  const api = await prepare(page);
  const trend = inspectionsTrendOutput();
  await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, {
    ...trend,
    comparison: { mode: 'previous_period', summary: { total: 0, delta: 0 } },
  });
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID);
  await expect(page.getByTestId('org-statistics-chart-inspections')).toContainText(
    'No previous-period baseline',
  );
});

test('distinguishes missing aggregate counts from a valid empty snapshot', async ({ page }) => {
  const api = await prepare(page);
  await api.mockOrganizationDashboard(
    E2E_ORGANIZATION_ID,
    organizationDashboardOutput({
      overview: {
        ...organizationDashboardOutput().overview,
        nonConformities: { summary: [{ key: 'open', value: 2 }] },
      },
      alerts: [],
      recentInterventions: [],
    }),
  );
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID);
  await expect(page.getByTestId('org-dashboard-kpi-open-non-conformities')).toContainText('—');
  await expect(page.getByTestId('org-dashboard-risk')).toContainText(
    'Status breakdown unavailable',
  );
  await expect(page.getByTestId('org-dashboard-alerts')).toContainText('No attention items raised');
  await expect(page.getByTestId('org-dashboard-recent')).toContainText('No recent interventions');
  await page.getByTestId('org-dashboard-additional').click();
  await expect(page.getByText('Severity breakdown unavailable')).toBeVisible();
  await expect(page.getByText('0 recorded, across all statuses')).toHaveCount(0);
});

test('removes destinations and recent interventions without their read permissions', async ({
  page,
}) => {
  const api = await prepare(page);
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ['organization.dashboard.read'],
  });
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID);
  await expect(page.getByTestId('org-dashboard-risk')).toBeVisible();
  await expect(page.getByTestId('org-dashboard-recent')).toHaveCount(0);
  await expect(page.getByTestId('org-dashboard-kpi-open-interventions')).toHaveCount(0);
  await expect(page.getByTestId('org-dashboard-kpis').getByRole('link')).toHaveCount(0);
  await expect(page.getByTestId('org-dashboard-alerts').getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New intervention', exact: true })).toHaveCount(0);
});

test('does not link expired invitations without member-management permission', async ({ page }) => {
  const api = await prepare(page);
  await api.mockOrganizationDashboard(
    E2E_ORGANIZATION_ID,
    organizationDashboardOutput({
      alerts: [organizationDashboardAlertOutput({ code: 'expired_invitations', count: 2 })],
    }),
  );
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ['organization.dashboard.read', 'organization.members.read'],
  });
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID);

  const alerts = page.getByTestId('org-dashboard-alerts');
  await expect(alerts).toContainText('Invitations expired');
  await expect(alerts.getByRole('link', { name: /Invitations expired/i })).toHaveCount(0);
});

for (const source of ['aggregate', 'primary', 'secondary'] as const) {
  test('retries only the failed ' + source + ' data source', async ({ page }) => {
    const api = await prepare(page);
    if (source === 'aggregate')
      await api.mockOrganizationDashboardError(E2E_ORGANIZATION_ID, { status: 500 });
    if (source === 'primary')
      await api.mockDashboardInspectionsTrendError(E2E_ORGANIZATION_ID, { status: 500 });
    if (source === 'secondary')
      await page.route(/\/dashboard\/trends\/equipment-created(?:\?|$)/, (route) =>
        route.fulfill({ status: 500, json: { title: 'Unavailable' } }),
      );
    await page.goto('/organizations/' + E2E_ORGANIZATION_ID);
    if (source === 'secondary') await page.getByTestId('org-dashboard-additional').click();
    const retry =
      source === 'aggregate'
        ? page.getByRole('alert').getByRole('button', { name: 'Retry', exact: true })
        : page
            .getByTestId(
              source === 'primary'
                ? 'org-statistics-chart-inspections'
                : 'org-statistics-chart-equipment',
            )
            .getByRole('button', { name: 'Retry', exact: true });
    await expect(retry).toBeVisible();
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/dashboard')) requests.push(request.url());
    });
    if (source === 'aggregate')
      await api.mockOrganizationDashboard(E2E_ORGANIZATION_ID, organizationDashboardOutput());
    if (source === 'primary')
      await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, inspectionsTrendOutput());
    if (source === 'secondary')
      await api.mockDashboardEquipmentCreatedTrend(
        E2E_ORGANIZATION_ID,
        equipmentCreatedTrendOutput(),
      );
    await retry.click();
    if (source === 'aggregate')
      await expect(
        page.getByTestId('org-dashboard-risk').locator('tanstack-chart svg'),
      ).toBeVisible();
    else
      await expect(
        page
          .getByTestId(
            source === 'primary'
              ? 'org-statistics-chart-inspections'
              : 'org-statistics-chart-equipment',
          )
          .locator('tanstack-chart svg'),
      ).toBeVisible();
    expect(requests.length).toBeGreaterThan(0);
    if (source === 'aggregate')
      expect(requests.every((url) => !url.includes('/trends/'))).toBe(true);
    if (source === 'primary')
      expect(requests.every((url) => /trends\/(inspections|non-conformities)/.test(url))).toBe(
        true,
      );
    if (source === 'secondary')
      expect(
        requests.every((url) => /trends\/(equipment-created|facilities-created)/.test(url)),
      ).toBe(true);
  });
}

test('reflows at 200 percent zoom and updates charts on a live theme change', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page);
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID);
  const risk = page.getByTestId('org-dashboard-risk');
  await expect(risk.locator('tanstack-chart svg')).toBeVisible();
  await page.locator('#theme-switcher-trigger').click();
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(risk.locator('tanstack-chart svg')).toBeVisible();
  // CSS zoom exercises the actual layout at twice the text/control size.
  await page.locator('html').evaluate((el) => (el.style.zoom = '2'));
  await expectNoHorizontalOverflow(page);
  await risk.locator('tanstack-chart svg').focus();
  await page.keyboard.press('ArrowRight');
  await expect(risk.getByRole('status')).toBeVisible();
  await expect(page.getByTestId('org-dashboard-recent').locator('ul')).toBeVisible();
});
