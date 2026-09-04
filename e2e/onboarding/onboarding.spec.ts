import { expect, test } from '@playwright/test';
import { inProgressOnboardingOutput, onboardingOutput } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OnboardingPage } from '../support/pages/onboarding.page';

const SCREENSHOT_DIR = 'test-results/uiux-final-20260903';

test.describe('Onboarding wizard first step', () => {
  test('renders the create-organization form inside the split shell on desktop, with the compact showcase panel', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    const onboarding = new OnboardingPage(page);

    await onboarding.goto();

    await expect(onboarding.shellRoot).toBeVisible();
    await expect(onboarding.orgNameInput).toBeVisible();
    await expect(onboarding.orgSlugInput).toBeHidden();
    await page.getByRole('button', { name: 'Customize the workspace address' }).click();
    await expect(onboarding.orgSlugInput).toBeVisible();
    await expect(onboarding.orgSubmit).toBeVisible();
    await expect(onboarding.showcasePanel).toBeVisible();
    await expect(onboarding.showcasePanel.getByText('Fireguard')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/onboarding-first-step-light-desktop.png` });
  });

  test('hides the showcase panel and shows the compact step rail at 375px, in dark mode, with no console errors', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    const onboarding = new OnboardingPage(page);

    await onboarding.goto();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(onboarding.orgNameInput).toBeVisible();
    await expect(onboarding.showcasePanel).toBeHidden();
    await expect(page.getByTestId('onboarding-wizard-step-rail')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/onboarding-first-step-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});

test.describe('Onboarding guard chain', () => {
  test('redirects a dashboard route to /onboarding when the record is incomplete', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());

    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test('redirects /onboarding to the dashboard when the record is already completed', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(onboardingOutput({ state: 'completed' }));

    await page.goto('/onboarding');

    await expect(page).not.toHaveURL(/\/onboarding$/, { timeout: 10_000 });
  });
});
