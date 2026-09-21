import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID, organizationOutput } from '../fixtures/api-fixtures';
import {
  E2E_PLAN_PRICING,
  organizationQuotaOutput,
  organizationSubscriptionOutput,
  planOutput,
} from '../fixtures/billing-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { OrganizationSettingsPage } from '../pages/organization-settings.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Exercises a delayed Checkout reconciliation using only the existing API mock boundary. */
export async function verifyBillingConfirmation(page: Page, info: TestInfo): Promise<void> {
  await page.clock.install();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organizationOutput({ planName: 'Free' })] });
  await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
  await api.mockOrganizationInvoices(E2E_ORGANIZATION_ID);
  await api.mockBillingPricing(E2E_PLAN_PRICING);
  await api.mockPlans([planOutput()]);
  await api.mockOrganizationSubscription(
    E2E_ORGANIZATION_ID,
    organizationSubscriptionOutput({ active: false, status: 'incomplete', planKey: 'free' }),
  );
  const settings = new OrganizationSettingsPage(page);
  await settings.returnFromCheckout(E2E_ORGANIZATION_ID, 'pro', 'month');
  await expect(settings.checkoutPending).toBeVisible();
  await expect(settings.checkoutRefresh).toBeDisabled();
  await expect(settings.checkoutConfirmed).toBeHidden();
  await expect(page.getByTestId('organization-plan-card-pro')).toBeVisible();
  await expect(settings.root).toContainText('No invoices yet');
  await expectNoHorizontalOverflow(page);

  const path = `e2e/artifacts/reliability/billing-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${path}-pending.png`, animations: 'disabled', fullPage: true });
  await page.clock.runFor(32000);
  await expect(settings.checkoutRefresh).toBeEnabled();
  await expect(settings.checkoutPending).toBeVisible();
  await api.mockOrganizationSubscription(
    E2E_ORGANIZATION_ID,
    organizationSubscriptionOutput({
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    }),
  );
  await api.mockOrganizationDetail(organizationOutput({ planName: 'Pro' }));
  const quotaRefresh = page.waitForRequest(/\/quota$/);
  if (info.project.name === 'chromium') {
    await settings.checkoutRefresh.focus();
    await expect(settings.checkoutRefresh).toBeFocused();
    await page.keyboard.press('Enter');
  } else {
    await settings.refreshCheckout();
  }
  await page.clock.runFor(100);
  await expect(settings.checkoutConfirmed).toBeVisible();
  await quotaRefresh;
  await expect(settings.checkoutPending).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${path}-confirmed.png`, animations: 'disabled', fullPage: true });
}
