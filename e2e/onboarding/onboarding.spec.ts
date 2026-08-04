import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { OnboardingPage } from '../support/pages/onboarding.page';

/**
 * Onboarding wizard entry — `/onboarding` (`OnboardingPage`,
 * `src/app/features/onboarding`).
 *
 * Scoped to the wizard's welcome phase and the `onboardingGuard` redirect
 * behavior. The step-by-step wizard flow (organization creation, per-step
 * dynamic forms) is a large, self-contained workflow intentionally left out
 * of this pass — see `e2e/README.md`.
 */
test.describe('Onboarding', () => {
  test('shows the welcome phase for a user with incomplete onboarding', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ onboarding: { state: 'in_progress' } });

    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.goto();

    await expect(page).toHaveURL('/onboarding');
    await expect(onboardingPage.startSetupButton).toBeVisible();
  });

  test('redirects to the default organization when onboarding is already completed', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ onboarding: { state: 'completed' } });

    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/organizations\/e2e-org-1$/);
    await expect(page.locator('#organization-today')).toBeVisible();
  });
});
