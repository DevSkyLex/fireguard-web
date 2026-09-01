import { expect, test } from '@playwright/test';
import {
  inProgressOnboardingOutput,
  loginOutput,
  registerOutput,
} from '../support/fixtures/api-fixtures';
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

    await expect(page).toHaveURL(/\/auth\/register\/verify$/);
    await expect(auth.registerVerifyRoot).toBeVisible();
  });

  test('verifying the emailed code establishes the session and lands on onboarding', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockRegister(registerOutput());
    await api.mockRegisterVerify(loginOutput());
    await api.mockSessionData({ onboarding: inProgressOnboardingOutput() });
    const auth = new AuthPages(page);

    await auth.gotoRegister();
    await auth.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@fireguard.test',
      password: 'Passw0rd!',
    });
    await expect(page).toHaveURL(/\/auth\/register\/verify$/);

    await auth.submitOtp('123456');

    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 10_000 });
  });
});
