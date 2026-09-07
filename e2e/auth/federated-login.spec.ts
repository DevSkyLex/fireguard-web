import { expect, test } from '@playwright/test';
import { loginOutput } from '../support/fixtures/api-fixtures';
import {
  invitationPreviewOutput,
  E2E_INVITATION_TOKEN,
} from '../support/fixtures/invitation-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

test.describe('Federated sign-in callback', () => {
  for (const rememberedOrganization of [false, true]) {
    test(`continues Google sign-in to MFA with remembered organization: ${rememberedOrganization}`, async ({
      page,
      baseURL,
    }) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      let memberRequests = 0;
      if (rememberedOrganization) {
        await page.context().addCookies([
          {
            name: 'last-organization',
            value: 'deleted-organization',
            url: baseURL,
          },
        ]);
        await page.route(/\/api\/organizations\/deleted-organization\/me$/, async (route) => {
          memberRequests++;
          await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
        });
      }
      await api.mockFederatedLoginComplete(
        'google',
        loginOutput({
          access_token: null,
          expires_in: null,
          mfa_required: true,
          mfa_token: 'e2e-federated-pre-auth-token',
          challenge_token: 'e2e-federated-challenge-token',
          mfa_method: 'email',
          mfa_destination: 'e***r@f*******d.test',
          mfa_resend_in: 30,
          return_url: '/',
        }),
      );

      await page.goto('/auth/federated/google/callback?code=provider-code&state=flow-state', {
        waitUntil: 'domcontentloaded',
      });

      await expect(page.locator('#mfa-verify-page')).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/mfa-verify$/);
      expect(memberRequests).toBe(0);
    });
  }
});

for (const outcome of ['cancelled', 'account_exists'] as const) {
  test(`retains an invitation after Google ${outcome}, password recovery and MFA`, async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const returnUrl = `/organizations/invitations/accept?token=${E2E_INVITATION_TOKEN}`;
    // Model the tab-local context written before leaving Fireguard for the provider.
    await page.goto('/auth/login');
    await page.evaluate(
      (destination) =>
        sessionStorage.setItem(
          'fireguard.auth.federated-return',
          JSON.stringify({ provider: 'google', returnUrl: destination, createdAt: Date.now() }),
        ),
      returnUrl,
    );
    if (outcome === 'account_exists') {
      await page.route('**/api/auth/federated/google/complete', (route) =>
        route.fulfill({ status: 409, json: { status: 409, detail: 'account_exists' } }),
      );
    }
    const callback =
      outcome === 'cancelled'
        ? 'error=access_denied&state=provider-state'
        : 'code=provider-code&state=provider-state';
    await page.goto(`/auth/federated/google/callback?${callback}`);
    const recovery = page.getByRole('link', { name: 'Back to sign in' });
    await expect(recovery).toHaveAttribute(
      'href',
      `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
    await expect(page).not.toHaveURL(/[?&](?:code|state)=/);
    expect(
      await page.evaluate(() => sessionStorage.getItem('fireguard.auth.federated-return')),
    ).toBeNull();
    await page.reload();
    await expect(recovery).toHaveAttribute(
      'href',
      `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
    await recovery.click();
    await expect(page).toHaveURL(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    await api.mockLogin(
      loginOutput({
        access_token: '',
        expires_in: 0,
        mfa_required: true,
        mfa_token: 'e2e-pre-auth',
        challenge_token: 'e2e-challenge',
        mfa_method: 'email',
        mfa_destination: 'e***@example.com',
        mfa_resend_in: 30,
      }),
    );
    const auth = new AuthPages(page);
    await auth.login('invitee@fireguard.test', 'Passw0rd!');
    await expect(auth.mfaVerifyRoot).toBeVisible();
    await expect(page).toHaveURL(`/auth/mfa-verify?returnUrl=${encodeURIComponent(returnUrl)}`);
    await api.mockMfaVerify(loginOutput());
    await api.mockSessionData();
    await api.mockInvitationPreview(E2E_INVITATION_TOKEN, invitationPreviewOutput());
    await auth.submitOtp('123456');
    await expect(page).toHaveURL(returnUrl);
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
  });
}

test('authenticates an anonymous organization deep link before requesting protected onboarding', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockUnauthenticatedSession();
  let onboardingReads = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/onboarding/')) onboardingReads++;
  });
  const destination = '/organizations/protected-org/interventions?view=calendar';
  await page.goto(destination);
  await expect(page).toHaveURL(`/auth/login?returnUrl=${encodeURIComponent(destination)}`);
  await expect(page.getByTestId('login-email')).toBeVisible();
  expect(onboardingReads).toBe(0);
});
