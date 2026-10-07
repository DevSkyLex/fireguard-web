import { expect, test } from '@playwright/test';
import {
  E2E_ORGANIZATION_ID,
  inProgressOnboardingOutput,
  onboardingOutput,
} from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { ApiMock } from '../support/mocks/api-mock';
import { OnboardingPage } from '../support/pages/onboarding.page';

const SCREENSHOT_DIR = 'tests/e2e/artifacts/corrections/first-step';

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
    await expect(onboarding.orgSubmit).toBeVisible();
    await expect(onboarding.showcasePanel).toBeVisible();
    await expect(onboarding.showcasePanel.getByText('Fireguard')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/onboarding-first-step-light-desktop.png` });
  });

  for (const dark of [false, true]) {
    const theme = dark ? 'dark' : 'light';

    test(`hides the showcase panel and keeps the first step immediately usable at 375px in ${theme} mode`, async ({
      page,
      context,
      baseURL,
    }) => {
      const consoleErrors = collectConsoleErrors(page);
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await page.setViewportSize({ width: 375, height: 800 });

      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockOnboarding(inProgressOnboardingOutput());
      const onboarding = new OnboardingPage(page);

      await onboarding.goto();

      if (dark) await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(onboarding.orgNameInput).toBeVisible();
      await expect(onboarding.showcasePanel).toBeHidden();
      await expect(page.getByTestId('onboarding-wizard-step-rail')).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const inputBounds = await onboarding.orgNameInput.boundingBox();
      expect(inputBounds?.y).toBeLessThan(400);
      expect(inputBounds?.height).toBeGreaterThanOrEqual(44);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/onboarding-first-step-${theme}-mobile.png`,
        animations: 'disabled',
      });
      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
    });
  }
});

test.describe('Onboarding guard chain', () => {
  test('preserves the dashboard destination when resuming a pinned creation', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(
      inProgressOnboardingOutput({ targetOrganizationId: E2E_ORGANIZATION_ID }),
    );

    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding\/create\?returnUrl=%2Forganizations$/);
  });

  test('redirects /onboarding to the equipment park when the record is already completed', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(onboardingOutput({ state: 'completed' }));

    await page.goto('/onboarding');

    await expect(page).toHaveURL(new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/assets$`), {
      timeout: 10_000,
    });
  });
});

test.describe('visual evidence', () => {
  test('renders the wizard first step à 375px en mode sombre', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    const onboarding = new OnboardingPage(page);

    await onboarding.goto();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(onboarding.orgNameInput).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/onboarding-wizard-375-dark.png`,
    });
  });

  test('renders the wizard first step à 1280px en mode clair', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    const onboarding = new OnboardingPage(page);

    await onboarding.goto();

    await expect(onboarding.shellRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/onboarding-wizard-1280-light.png`,
    });
  });
});
