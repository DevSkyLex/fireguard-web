import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, organizationOutput } from '../support/fixtures/api-fixtures';
import {
  E2E_PLAN_PRICING,
  invoiceOutput,
  organizationQuotaOutput,
  organizationSubscriptionOutput,
  planOutput,
} from '../support/fixtures/billing-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationSettingsPage } from '../support/pages/organization-settings.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/92f41712-7d5f-443b-af9a-18c346a39be0/scratchpad/screenshots';

test.describe('Organization settings', () => {
  test('opens on the General tab by default and offers the Danger zone tab with delete permission', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [organizationOutput({ planName: 'Pro' })],
    });
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    const settings = new OrganizationSettingsPage(page);

    await settings.goto(E2E_ORGANIZATION_ID);

    await expect(settings.root).toBeVisible();
    await expect(settings.generalTab).toHaveAttribute('data-state', 'active');
    await expect(settings.dangerTab).toBeVisible();
    await expect(page.locator('#org-settings-name')).toHaveValue('E2E Organization');
  });

  test('deep-links onto the Usage tab and renders the quota meters', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    const settings = new OrganizationSettingsPage(page);

    await settings.goto(E2E_ORGANIZATION_ID, 'usage');

    await expect(settings.usageTab).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('organization-usage-row-members')).toBeVisible();
    await expect(page.getByTestId('organization-usage-row-members')).toContainText(
      'Active members count toward this limit',
    );
    await expect(page.getByTestId('organization-usage-row-members')).toContainText(
      '23 available before the plan limit',
    );
  });

  test('lazy-loads subscription data only once the Subscription tab is activated', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [organizationOutput({ planId: 'e2e-plan-pro', planName: 'Pro' })],
    });
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationSubscription(E2E_ORGANIZATION_ID, organizationSubscriptionOutput());
    await api.mockOrganizationInvoices(E2E_ORGANIZATION_ID, [invoiceOutput()]);
    await api.mockBillingPricing([
      ...E2E_PLAN_PRICING,
      {
        '@id': '/api/billing/pricing/max',
        '@type': 'PlanPricing',
        planKey: 'max',
        currency: 'eur',
        monthlyAmount: 9900,
        yearlyAmount: 99000,
      },
    ]);
    await api.mockPlans([
      planOutput({
        '@id': '/api/plans/e2e-plan-free',
        id: 'e2e-plan-free',
        key: 'free',
        name: 'Free',
        description: 'Get started with the essentials.',
        limits: { members: 5, facilities: 2, equipment: 50 },
        quotas: [
          { resource: 'members', label: 'Members', limit: 5, summary: 'Up to 5 members' },
          { resource: 'facilities', label: 'Facilities', limit: 2, summary: 'Up to 2 facilities' },
          { resource: 'equipment', label: 'Equipment', limit: 50, summary: 'Up to 50 equipment' },
          {
            resource: 'inspections',
            label: 'Inspections',
            limit: 100,
            summary: 'Up to 100 inspections',
          },
        ],
        sortOrder: 0,
        isDefault: true,
      }),
      planOutput(),
      planOutput({
        '@id': '/api/plans/e2e-plan-max',
        id: 'e2e-plan-max',
        key: 'max',
        name: 'Max',
        description: 'For large organizations.',
        limits: { members: 250, facilities: 125, equipment: 10000 },
        quotas: [
          { resource: 'members', label: 'Members', limit: 250, summary: 'Up to 250 members' },
          {
            resource: 'facilities',
            label: 'Facilities',
            limit: 125,
            summary: 'Up to 125 facilities',
          },
          {
            resource: 'equipment',
            label: 'Equipment',
            limit: 10000,
            summary: 'Up to 10,000 equipment',
          },
          {
            resource: 'inspections',
            label: 'Inspections',
            limit: 25000,
            summary: 'Up to 25,000 inspections',
          },
        ],
        sortOrder: 2,
      }),
    ]);
    const settings = new OrganizationSettingsPage(page);

    await settings.goto(E2E_ORGANIZATION_ID);
    await expect(settings.root).toBeVisible();

    // Not requested yet: the tab has not been opened.
    const subscriptionRequest = page.waitForRequest(/\/billing\/subscription$/);

    await settings.subscriptionTab.click();

    await subscriptionRequest;
    await expect(settings.billingPortalButton).toBeVisible();
    await expect(page.getByTestId('organization-plan-card-pro')).toBeVisible();
    await expect(page.getByTestId('organization-plan-card-max')).toContainText(
      'Everything in Pro, plus:',
    );
    await page.getByRole('button', { name: 'Annual' }).click();
    await expect(page.getByTestId('organization-plan-card-free')).toContainText('Free');
    await expect(page.getByTestId('organization-plan-card-max')).toContainText(/€990\.00\/year/);
    await expect(settings.invoiceRows).toHaveCount(1);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-subscription-light-desktop.png` });
  });

  test('renders at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationLegalTypes();
    const settings = new OrganizationSettingsPage(page);

    await settings.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(settings.root).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    const settings = new OrganizationSettingsPage(page);

    await settings.goto(E2E_ORGANIZATION_ID);

    await expect(settings.root).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-light-desktop.png` });
  });
});
