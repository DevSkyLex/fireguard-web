import { devices, expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, organizationOutput } from '../support/fixtures/api-fixtures';
import {
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  organizationDashboardOutput,
} from '../support/fixtures/dashboard-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import {
  INTERACTION_MODE_INTERVENTIONS,
  captureInteractionMode,
  emulateMobilePlatform,
  mockInteractionModeInterventions,
} from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { InteractionModePage } from '../support/pages/interaction-mode.page';
import { InterventionsPage } from '../support/pages/interventions.page';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

for (const theme of ['light', 'dark'] as const) {
  test(`keeps phone navigation and tactile cards in ${theme} theme after a wide landscape resize`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    const origin = baseURL ?? 'http://localhost:4273';
    if (theme === 'dark') await setDarkTheme(context, origin);
    else await context.addCookies([{ name: 'theme-preference', value: 'light', url: origin }]);
    const errors = collectConsoleErrors(page);
    await mockInteractionModeInterventions(page);
    await new InterventionsPage(page).goto(E2E_ORGANIZATION_ID);
    const shell = new InteractionModePage(page);
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(shell.navigation.getByRole('link')).toHaveText([
      'Home',
      'Interventions',
      'Assets',
      'Messages',
      'More',
    ]);
    await expect(
      shell.navigation.getByRole('link', { name: 'Interventions', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    const activeLink = shell.navigation.getByRole('link', {
      name: 'Interventions',
      exact: true,
    });
    const indicator = activeLink.getByTestId('mobile-nav-active-indicator');
    const navigationBand = page.locator('#dashboard-mobile-navigation');
    const [activeBox, indicatorBox, navigationBox] = await Promise.all([
      activeLink.boundingBox(),
      indicator.boundingBox(),
      navigationBand.boundingBox(),
    ]);
    if (!activeBox || !indicatorBox || !navigationBox) {
      throw new Error('Expected the active mobile destination and its navigation border.');
    }
    expect(Math.abs(indicatorBox.width - 32)).toBeLessThanOrEqual(1);
    expect(Math.abs(indicatorBox.height - 2)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(indicatorBox.x + indicatorBox.width / 2 - (activeBox.x + activeBox.width / 2)),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(indicatorBox.y - navigationBox.y)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('dashboard-sidebar-trigger')).toHaveCount(0);
    await expect(page.getByTestId('intervention-table')).toBeHidden();
    await expect(page.getByTestId('intervention-table-cards')).toBeVisible();
    await expect(page.getByTestId('intervention-table-card')).toHaveCount(
      INTERACTION_MODE_INTERVENTIONS.length,
    );
    await Promise.all(
      (await shell.navigation.getByRole('link').all()).map(async (link) => {
        await expect(link).toBeInViewport();
        expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }),
    );
    const geometry = await page.locator('#dashboard-content').boundingBox();
    const navigation = await shell.navigation.boundingBox();
    if (!geometry || !navigation)
      throw new Error('Expected visible content and bottom navigation.');
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(navigation.y + 1);
    await expectNoHorizontalOverflow(page);
    await captureInteractionMode(page, info, `phone-${theme}`);
    await page.setViewportSize({ width: 1180, height: 820 });
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    await expect(shell.navigation).toBeInViewport();
    await expect(page.getByTestId('dashboard-sidebar-trigger')).toHaveCount(0);
    const list = new InterventionsPage(page);
    await list.openFilters();
    await list.addFilterTrigger.click();
    await expect(page.getByTestId('interventions-filters-add-drawer')).toBeVisible();
    expect(
      (await page.getByTestId('interventions-filters-add-option').first().boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
    await captureInteractionMode(page, info, `phone-wide-landscape-${theme}`);
    expect(errors).toEqual([]);
  });
}

test('uses mobile interactions on a wide tablet with device and touch evidence', async ({
  browser,
  browserName,
  baseURL,
}, info) => {
  const tablet =
    browserName === 'webkit'
      ? { ...devices['iPad Pro 11 landscape'] }
      : {
          viewport: { width: 1280, height: 800 },
          screen: { width: 1280, height: 800 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          userAgent:
            'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        };
  const context = await browser.newContext({ ...tablet, baseURL });
  try {
    await emulateMobilePlatform(context, browserName === 'webkit' ? 'ipad' : 'android-tablet');
    const page = await context.newPage();
    await mockInteractionModeInterventions(page);
    await new InterventionsPage(page).goto(E2E_ORGANIZATION_ID);
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    await expect(page.locator('#organization-mobile-navigation')).toBeInViewport();
    await expect(page.getByTestId('dashboard-sidebar-trigger')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    const list = new InterventionsPage(page);
    await list.openFilters();
    await list.addFilterTrigger.click();
    await expect(page.getByTestId('interventions-filters-add-drawer')).toBeVisible();
    expect(
      (await page.getByTestId('interventions-filters-add-option').first().boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
    await captureInteractionMode(page, info, 'tablet-landscape');
  } finally {
    await context.close();
  }
});

test('keeps every permitted secondary route in More and switches organizations through its drawer', async ({
  page,
}, info) => {
  const second = organizationOutput({
    id: 'adaptive-second-org',
    '@id': '/api/organizations/adaptive-second-org',
    name: 'Western distribution depot — maintenance and fire safety',
  });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organizationOutput(), second] });
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, { permissions: ['organization.*'] });
  await api.mockOrganizationAccess(second.id, { permissions: ['organization.interventions.read'] });
  await api.mockOrganizationDashboard(
    second.id,
    organizationDashboardOutput({ '@id': `/api/organizations/${second.id}/dashboard` }),
  );
  await api.mockDashboardInspectionsTrend(second.id, inspectionsTrendOutput());
  await api.mockDashboardNonConformitiesOpenedTrend(second.id, nonConformitiesOpenedTrendOutput());
  await api.mockDashboardNonConformitiesResolvedTrend(
    second.id,
    nonConformitiesResolvedTrendOutput(),
  );
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  const shell = new InteractionModePage(page);
  const routes = [
    ['Calendar', 'calendar'],
    ['Inspections', 'inspections'],
    ['Checklists', 'checklists'],
    ['Maintenance', 'maintenance'],
    ['Approvals', 'approvals'],
    ['Imports', 'imports'],
    ['Channels', 'channels'],
    ['Members', 'members'],
    ['Teams', 'members?tab=teams'],
    ['Roles and permissions', 'members?tab=roles'],
    ['Settings', 'settings'],
    ['Billing', 'settings?tab=subscription'],
    ['Audit journal', 'audit'],
  ];
  await Promise.all(
    routes.map(async ([label, path]) => {
      await expect(shell.more.getByRole('link', { name: label, exact: true })).toHaveAttribute(
        'href',
        `/organizations/${E2E_ORGANIZATION_ID}/${path}`,
      );
    }),
  );
  await expect(
    shell.more.getByRole('link', { name: 'Notification preferences', exact: true }),
  ).toHaveAttribute('href', '/account/notifications?tab=preferences');
  await expect(
    shell.more.getByRole('link', { name: 'Your organizations', exact: true }),
  ).toHaveAttribute('href', '/account/organizations');
  await expect(shell.navigation.getByRole('link', { name: 'More', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await captureInteractionMode(page, info, 'more-routes');
  await page.locator('#organization-more-switcher-trigger').click();
  const switcher = page.getByRole('dialog', { name: 'Switch organization', exact: true });
  await expect(
    switcher.getByRole('heading', { name: 'Switch organization', exact: true }),
  ).toBeVisible();
  await expect(switcher.getByText('No organizations found.', { exact: true })).toBeHidden();
  await switcher.getByRole('combobox').fill('Western');
  await expect(switcher.getByText('No organizations found.', { exact: true })).toBeHidden();
  await captureInteractionMode(page, info, 'organization-switcher');
  const secondOption = switcher.getByRole('option', { name: second.name });
  await expect(secondOption).toBeVisible();
  await secondOption.click();
  await expect(page).toHaveURL(new RegExp(`/organizations/${second.id}(?:/interventions)?$`));
  await expect(switcher).toHaveCount(0);
  await expect(shell.navigation.getByRole('link')).toHaveText(['Home', 'Interventions', 'More']);
  await shell.navigation.getByRole('link', { name: 'More', exact: true }).click();
  await expect(page.locator('#organization-more-switcher-trigger')).toContainText(second.name);
  await expect(shell.more.locator('#organization-more-administration')).toHaveCount(0);
  await expect(shell.more.getByRole('link', { name: 'Channels', exact: true })).toHaveCount(0);
  await expect(
    shell.more.getByRole('link', { name: 'Your organizations', exact: true }),
  ).toBeVisible();
});

test('traps focus in appearance and returns it to the More trigger after Escape', async ({
  page,
}, info) => {
  await new ApiMock(page).mockAuthenticatedSession();
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  const shell = new InteractionModePage(page);
  const trigger = shell.more.getByRole('button', { name: /^Appearance:/ });
  await trigger.focus();
  await trigger.press('Enter');
  await expect(
    shell.appearance.getByRole('heading', { name: 'Appearance', exact: true }),
  ).toBeVisible();
  await expect(
    shell.appearance.getByRole('heading', { name: 'Appearance', exact: true }),
  ).toBeFocused();
  await expect(page.getByText('Interface layout', { exact: true })).toHaveCount(0);
  await expect
    .poll(() => shell.appearance.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  await shell.appearance.getByRole('button', { name: 'Close', exact: true }).focus();
  await page.keyboard.press('Tab');
  await info.attach('appearance-forward-tab-focus', {
    body: JSON.stringify(
      await page.evaluate(() => ({
        active: document.activeElement?.outerHTML.slice(0, 1_000),
        sentinels: Array.from(document.querySelectorAll('.cdk-focus-trap-anchor')).map(
          (node) => node.outerHTML,
        ),
      })),
    ),
    contentType: 'application/json',
  });
  await expect
    .poll(() => shell.appearance.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect
    .poll(() => shell.appearance.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  await captureInteractionMode(page, info, 'appearance-focus');
  await page.keyboard.press('Escape');
  await expect(shell.appearance).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('stages multiple status filters until Apply and discards Cancel and Escape edits', async ({
  page,
}, info) => {
  await mockInteractionModeInterventions(page);
  const list = new InterventionsPage(page);
  await list.gotoWithQuery(E2E_ORGANIZATION_ID, 'status=planned,in_progress');
  await expect(page.getByTestId('intervention-table-card')).toHaveCount(2);
  const trigger = page.getByTestId('interventions-filter-status');
  await trigger.focus();
  await trigger.press('Enter');
  const drawer = page.getByTestId('interventions-filter-status-drawer');
  await expect(drawer).toBeVisible();
  const planned = drawer.getByRole('checkbox', { name: 'Planned', exact: true });
  const progress = drawer.getByRole('checkbox', { name: 'In progress', exact: true });
  await expect(planned).toBeChecked();
  await expect(progress).toBeChecked();
  const before = page.url();
  await progress.click();
  await expect(progress).not.toBeChecked();
  await expect(page).toHaveURL(before);
  await drawer.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(before);
  await trigger.press('Enter');
  await expect(progress).toBeChecked();
  await progress.click();
  await expect(progress).not.toBeChecked();
  await captureInteractionMode(page, info, 'filter-before-apply');
  await drawer.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/[?&]status=planned(&|$)/);
  await expect(page.getByTestId('intervention-table-card')).toHaveCount(1);
  await trigger.press('Enter');
  await expect(planned).toBeChecked();
  await expect(progress).not.toBeChecked();
  await progress.click();
  await expect(progress).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/[?&]status=planned(&|$)/);
  await page.reload();
  await expect(page.getByTestId('intervention-table-card')).toHaveCount(1);
  await expect(list.filterChip('Status')).toContainText('Planned');
});
