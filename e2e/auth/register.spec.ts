import { expect, test } from '@playwright/test';
import {
  inProgressOnboardingOutput,
  loginOutput,
  registerOutput,
} from '../support/fixtures/api-fixtures';
import { workspaceOptions } from '../support/fixtures/workspace-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

test.describe('Create an account', () => {
  test('renders the registration form', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const auth = new AuthPages(page);

    await auth.gotoRegister();

    await expect(auth.registerRoot).toBeVisible();
    await expect(auth.registerFirstName).toBeVisible();
    await expect(auth.registerLastName).toBeVisible();
    await expect(auth.registerEmail).toBeVisible();
    await expect(auth.registerPassword).toBeVisible();
    await expect(auth.registerSubmit).toBeVisible();
  });

  test('shows password guidance in an overlay and closes it without refocusing the password', async ({
    page,
  }, testInfo) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const auth = new AuthPages(page);

    await auth.gotoRegister();

    const passwordBefore = await auth.registerPassword.boundingBox();
    await auth.registerPassword.focus();

    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    await page.screenshot({
      path: `e2e/artifacts/corrections/password-guidance-${testInfo.project.name}.png`,
      animations: 'disabled',
    });
    await expect
      .poll(async () => {
        const field = await auth.registerPassword.boundingBox();
        const overlay = await popover.boundingBox();
        return (
          !!field &&
          !!overlay &&
          overlay.y >= 0 &&
          overlay.y + overlay.height <= (page.viewportSize()?.height ?? Infinity) &&
          (overlay.y >= field.y + field.height || overlay.y + overlay.height <= field.y)
        );
      })
      .toBe(true)
      .catch(async (error: unknown) => {
        await testInfo.attach('password-guidance-bounds', {
          body: JSON.stringify({
            field: await auth.registerPassword.boundingBox(),
            overlay: await popover.boundingBox(),
            viewport: page.viewportSize(),
            actualField: await auth.registerPassword.evaluate((element) =>
              element.getBoundingClientRect().toJSON(),
            ),
            actualOverlay: await popover.evaluate((element) =>
              element.getBoundingClientRect().toJSON(),
            ),
          }),
          contentType: 'application/json',
        });
        throw error;
      });

    const passwordAfter = await auth.registerPassword.boundingBox();
    const popoverBox = await popover.boundingBox();
    expect(passwordBefore).not.toBeNull();
    expect(passwordAfter).not.toBeNull();
    expect(popoverBox).not.toBeNull();
    if (!passwordBefore || !passwordAfter || !popoverBox) {
      throw new Error('Expected the password field and guidance popover to have bounds.');
    }
    expect(passwordAfter.y).toBe(passwordBefore.y);
    expect(popoverBox.y).toBeGreaterThanOrEqual(0);
    expect(popoverBox.y + popoverBox.height).toBeLessThanOrEqual(
      page.viewportSize()?.height ?? Infinity,
    );

    await expect(auth.registerPassword).toHaveAttribute(
      'aria-describedby',
      /register-password-requirements-description/,
    );
    const announcement = page.getByTestId('register-password-requirements-announcement');
    await auth.registerPassword.fill('abcdefgh');
    await expect(auth.registerPassword).toBeFocused();
    await expect(announcement).toContainText('Met');
    await expect(announcement).toContainText('Not met');
    const criteriaState = await announcement.textContent();
    await auth.registerPassword.press('i');
    await expect(announcement).toHaveText(criteriaState ?? '');
    await expect(announcement).not.toContainText('abcdefghi');
    await expect(auth.registerPassword).toBeFocused();

    await auth.registerRoot.locator('h1').click();
    await expect(popover).toHaveCount(0);
    await expect(auth.registerPassword).not.toBeFocused();
  });

  test('submits the draft and hands over to the email-verification step', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockRegister(registerOutput());
    const auth = new AuthPages(page);

    await auth.gotoRegister();
    await auth.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@fireguard.test',
      password: 'Passw0rd!',
    });

    await expect(page).toHaveURL(/\/auth\/register\/verify(\?.*)?$/);
    await expect(auth.registerVerifyRoot).toBeVisible();
  });

  test('verifying the emailed code establishes the session and lands on onboarding', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockRegister(registerOutput());
    await api.mockRegisterVerify(loginOutput());
    await api.mockSessionData({
      onboarding: inProgressOnboardingOutput({ state: 'not_started', flow: null, nextStep: null }),
      organizations: [],
    });
    await api.mockWorkspaceOptions(() => workspaceOptions({ organizations: [] }));
    const auth = new AuthPages(page);

    await auth.gotoRegister();
    await auth.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@fireguard.test',
      password: 'Passw0rd!',
    });
    await expect(page).toHaveURL(/\/auth\/register\/verify(\?.*)?$/);

    await auth.submitOtp('123456');

    await expect(page).toHaveURL(/\/onboarding\/workspace(?:\?.*)?$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Your workspace' })).toBeVisible();
  });
});
