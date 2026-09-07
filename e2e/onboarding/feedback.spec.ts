import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, inProgressOnboardingOutput } from '../support/fixtures/api-fixtures';
import { setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OnboardingPage } from '../support/pages/onboarding.page';

for (const width of [390, 1440]) {
  test(`shows API failures only in toasts and fills structured addresses at ${width}px`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    if (width === 1440) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    await page.route('**/api/organizations', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.fulfill({
        status: 409,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 409,
          title: 'Conflict',
          detail: 'Organization slug "test" already exists.',
        }),
      });
    });
    const onboarding = new OnboardingPage(page);
    await page.goto('/onboarding/create');
    await onboarding.orgNameInput.fill('test');
    await onboarding.orgSubmit.click();
    const toast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Organization slug "test" already exists.' });
    await expect(toast).toHaveCount(1);
    await expect(toast).toBeVisible();
    await expect(page.locator('#onboarding-wizard-page form')).not.toContainText('already exists');
    await page.screenshot({
      path: `e2e/artifacts/onboarding-feedback/toast-${width}.png`,
      animations: 'disabled',
    });

    await api.mockFacilityAddressSuggestions(E2E_ORGANIZATION_ID);
    await api.mockOnboarding(
      inProgressOnboardingOutput({
        nextStep: 'create_first_facility',
        targetOrganizationId: E2E_ORGANIZATION_ID,
      }),
    );
    await page.reload();
    await onboarding.facilityNameInput.fill('Headquarters');
    await onboarding.facilityTypeTrigger.click();
    await Promise.all(
      ['Site', 'Building', 'Floor', 'Zone', 'Area'].map((name) =>
        expect(
          page.getByRole('option', { name, exact: true }).locator('ng-icon svg').first(),
        ).toBeVisible(),
      ),
    );
    await page.screenshot({
      path: `e2e/artifacts/onboarding-feedback/types-${width}.png`,
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await onboarding.pickFacilityType('Site');
    await expect(onboarding.facilityTypeTrigger.locator('ng-icon svg').first()).toBeVisible();
    await onboarding.chooseFacilityAddress();
    await expect(onboarding.facilityAddressInput).toHaveValue('12 Quai des Docks');
    await expect(page.locator('#onboarding-facility-city')).toHaveValue('Le Havre');
    await expect(page.locator('#onboarding-facility-country')).toHaveValue('France');
    await expect(page.getByTestId('onboarding-country-flag').locator('svg')).toBeVisible();
    await expect(page.locator('#onboarding-facility-postalCode')).toHaveValue('76600');
    await page.locator('#onboarding-facility-postalCode').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `e2e/artifacts/onboarding-feedback/address-${width}.png`,
      animations: 'disabled',
    });
    await onboarding.facilityAddButton.click();
    await page.getByRole('button', { name: 'Edit Headquarters' }).click();
    await expect(page.locator('#onboarding-facility-city')).toHaveValue('Le Havre');
    await expect(page.getByTestId('onboarding-country-flag').locator('svg')).toBeVisible();
    await page.locator('#onboarding-facility-city').fill('Rouen');
    await expect(page.getByTestId('onboarding-country-flag')).toHaveCount(0);
    await expect(onboarding.facilityAddButton).toBeDisabled();
    await onboarding.facilitiesSubmit.click();
    await expect(page.getByText('Select a suggested address.', { exact: true })).toBeVisible();
  });
}
