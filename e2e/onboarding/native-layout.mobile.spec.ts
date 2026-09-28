import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { inProgressOnboardingOutput } from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';
import { OnboardingPage } from '../support/pages/onboarding.page';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

for (const dark of [false, true]) {
  test(`keeps authentication and resumed activation tactile in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await page.setViewportSize({ width: 375, height: 800 });
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const auth = new AuthPages(page);
    await auth.gotoLogin();
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    await expect(auth.loginSubmit).toBeInViewport();
    await Promise.all(
      [auth.loginEmail, auth.loginPassword, auth.loginSubmit].map(async (field) => {
        const bounds = await field.boundingBox();
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }),
    );
    await expectNoHorizontalOverflow(page);
    const captures = `e2e/artifacts/corrections/native-layout/${info.project.name}`;
    await mkdir(captures, { recursive: true });
    await page.screenshot({
      path: `${captures}/login-${dark ? 'dark' : 'light'}.png`,
      animations: 'disabled',
    });
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    const onboarding = new OnboardingPage(page);
    await page.goto('/onboarding/create');
    await expect(onboarding.orgNameInput).toBeInViewport();
    const field = await onboarding.orgNameInput.boundingBox();
    expect(field?.height).toBeGreaterThanOrEqual(44);
    expect(field?.y).toBeLessThan(400);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${captures}/organization-${dark ? 'dark' : 'light'}.png`,
      animations: 'disabled',
    });
  });
}
