import { expect, test } from '@playwright/test';
import {
  loginOutput,
  trustDeviceOutput,
  type LoginOutputFixture,
} from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

const MFA_CHALLENGE_RESPONSE = loginOutput({
  access_token: '',
  expires_in: 0,
  mfa_required: true,
  mfa_token: 'e2e-mfa-pre-auth-token',
  challenge_token: 'e2e-mfa-challenge-token',
  mfa_method: 'email',
  mfa_destination: 'e***r@f*******d.test',
  mfa_resend_in: 30,
});

/** Signs in through the real login flow, which is the only way the client-side `mfaGuard` lets `/auth/mfa-verify` render. */
async function reachMfaVerify(
  api: ApiMock,
  auth: AuthPages,
  challenge: LoginOutputFixture = MFA_CHALLENGE_RESPONSE,
): Promise<void> {
  await api.mockUnauthenticatedSession();
  await api.mockLogin(challenge);

  await auth.gotoLogin();
  await auth.login('e2e.user@fireguard.test', 'Passw0rd!');

  await expect(auth.mfaVerifyRoot).toBeVisible();
}

test.describe('MFA verification', () => {
  test('verifies the second-factor code and establishes the session', async ({ page }) => {
    const api = new ApiMock(page);
    const auth = new AuthPages(page);
    await reachMfaVerify(api, auth);

    await api.mockMfaVerify(loginOutput());
    await api.mockSessionData();

    await auth.submitOtp('123456');

    await expect(page).not.toHaveURL(/\/auth\/mfa-verify$/, { timeout: 10_000 });
  });

  test('trusts the device when the operator asks for it', async ({ page }) => {
    const api = new ApiMock(page);
    const auth = new AuthPages(page);
    await reachMfaVerify(api, auth);

    await api.mockMfaVerify(loginOutput());
    await api.mockSessionData();
    await api.mockTrustDevice(trustDeviceOutput());

    const trustRequest = page.waitForRequest(
      (request) => request.url().endsWith('/api/trusted-devices') && request.method() === 'POST',
    );
    await auth.otpTrustDevice.click();
    await auth.submitOtp('123456');

    await trustRequest;
    await expect(page).not.toHaveURL(/\/auth\/mfa-verify$/, { timeout: 10_000 });
  });

  test('does not trust the device unless asked', async ({ page }) => {
    const api = new ApiMock(page);
    const auth = new AuthPages(page);
    await reachMfaVerify(api, auth);

    await api.mockMfaVerify(loginOutput());
    await api.mockSessionData();
    let trustRequests = 0;
    await page.route(/\/api\/trusted-devices$/, async (route) => {
      trustRequests += 1;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await expect(auth.otpTrustDevice).toBeVisible();
    await auth.submitOtp('123456');

    await expect(page).not.toHaveURL(/\/auth\/mfa-verify$/, { timeout: 10_000 });
    expect(trustRequests).toBe(0);
  });

  test('resends the code on request', async ({ page }) => {
    const api = new ApiMock(page);
    const auth = new AuthPages(page);
    await reachMfaVerify(api, auth, loginOutput({ ...MFA_CHALLENGE_RESPONSE, mfa_resend_in: 0 }));
    await api.mockMfaResend(
      loginOutput({
        access_token: '',
        expires_in: 0,
        mfa_required: true,
        mfa_token: 'e2e-mfa-pre-auth-token-2',
        challenge_token: 'e2e-mfa-challenge-token-2',
        mfa_method: 'email',
        mfa_resend_in: 30,
      }),
    );

    await expect(auth.otpResend).toBeVisible();
    const resendRequest = page.waitForRequest(
      (request) => request.url().includes('/api/auth/mfa/resend') && request.method() === 'POST',
    );
    await auth.otpResend.click();

    await resendRequest;
  });
});
