import { expect, test } from '@playwright/test';
import { loginOutput } from '../support/fixtures/api-fixtures';
import {
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

const DESTINATION = '/organizations/invitations/accept?token=layout-invitation';
const CAPTURES = 'e2e/artifacts/auth-ux';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  for (const theme of ['light', 'dark']) {
    test(`keeps every auth step readable at ${viewport.width}px in ${theme} mode`, async ({
      page,
      context,
      baseURL,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      if (!baseURL) throw new Error('The test server URL is required.');
      if (theme === 'dark') await setDarkTheme(context, baseURL);
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();

      await [
        ['login', 'login-page'],
        ['register', 'register-page'],
        ['password-reset/forgot', 'forgot-password-page'],
        ['register/verify?token=layout-register', 'register-verify-page'],
        ['email-change/confirm?token=layout-confirm', 'email-change-confirm-page'],
        ['password-reset/verify?token=layout-reset', 'password-reset-verify-page'],
      ].reduce(async (previous, [route, root]): Promise<void> => {
        await previous;
        await page.goto(`/auth/${route}`);
        await expect(page.locator(`#${root}`)).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectNoInternalOverflow(page.locator('#split-layout-content'));
        await page.screenshot({
          path: `${CAPTURES}/${root}-${viewport.width}-${theme}.png`,
          animations: 'disabled',
        });
      }, Promise.resolve());

      await page.locator('#otp-code').fill('123456');
      await expect(page.locator('#new-password-page')).toBeVisible();
      await expectNoInternalOverflow(page.locator('#split-layout-content'));
      await page.screenshot({
        path: `${CAPTURES}/new-password-page-${viewport.width}-${theme}.png`,
        animations: 'disabled',
      });

      await api.mockLogin(
        loginOutput({
          access_token: '',
          expires_in: 0,
          mfa_required: true,
          mfa_token: 'layout-pre-auth',
          challenge_token: 'layout-challenge',
          mfa_method: 'email',
          mfa_destination: 'a.very.long.masked.address@fireguard-example.test',
          mfa_resend_in: 30,
        }),
      );
      const auth = new AuthPages(page);
      await page.goto(`/auth/login?returnUrl=${encodeURIComponent(DESTINATION)}`);
      await auth.login('e2e.user@fireguard.test', 'Passw0rd!');
      await expect(auth.mfaVerifyRoot).toBeVisible();
      await expectNoInternalOverflow(page.locator('#split-layout-content'));
      await page.screenshot({
        path: `${CAPTURES}/mfa-verify-page-${viewport.width}-${theme}.png`,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Back to sign in' }).click();
      await expect(auth.loginRoot).toBeVisible();
      expect(new URL(page.url()).searchParams.get('returnUrl')).toBe(DESTINATION);

      const brand = page.locator('#split-layout-brand');
      await expect
        .poll(() => brand.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      if (viewport.width < 1024) {
        await expect(brand).toBeVisible();
        const brandBox = await brand.boundingBox();
        const themeBox = await page.locator('#theme-switcher-trigger').boundingBox();
        if (!brandBox || !themeBox) throw new Error('The mobile header must be measurable.');
        expect(brandBox.x + brandBox.width).toBeLessThan(themeBox.x);
      } else {
        await expect(page.locator('#split-layout-showcase')).toBeVisible();
        const formBox = await auth.loginRoot.boundingBox();
        expect(formBox?.width).toBeLessThanOrEqual(448);
      }
    });
  }
}

test('keeps registration and its errors reachable on a narrow, short viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await new ApiMock(page).mockUnauthenticatedSession();
  const auth = new AuthPages(page);
  await auth.gotoRegister();
  await auth.registerSubmit.click();
  await expect(page.getByText('Enter your first name', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(page.locator('#split-layout-content'));
  await auth.registerSubmit.scrollIntoViewIfNeeded();
  await expect(auth.registerSubmit).toBeInViewport();
  const submitBox = await auth.registerSubmit.boundingBox();
  expect(submitBox?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${CAPTURES}/register-errors-320.png`, animations: 'disabled' });
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(auth.loginEmail).toBeInViewport();
});

test('centers the tablet form and keeps it scrollable in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await new ApiMock(page).mockUnauthenticatedSession();
  const auth = new AuthPages(page);
  await auth.gotoLogin();
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(headingBox?.y).toBeGreaterThan(200);
  await page.setViewportSize({ width: 768, height: 360 });
  await auth.gotoRegister();
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await auth.registerSubmit.scrollIntoViewIfNeeded();
  await expect(auth.registerSubmit).toBeInViewport();
  await expectNoInternalOverflow(page.locator('#split-layout-content'));
});
