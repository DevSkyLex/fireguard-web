import type { Page, Route } from '@playwright/test';
import {
  challengeOutput,
  currentOrganizationMemberProfileOutput,
  hydraCollection,
  loginOutput,
  mfaRequiredLoginOutput,
  onboardingOutput,
  organizationOutput,
  userProfileOutput,
  mercureSubscriptionOutput,
  type ChallengeOutputFixture,
  type CurrentOrganizationMemberProfileOutputFixture,
  type LoginOutputFixture,
  type OnboardingOutputFixture,
  type OrganizationOutputFixture,
  type UserProfileOutputFixture,
} from '../fixtures/api-fixtures';

/**
 * Backend origin the app is configured to call in the `e2e` build
 * (`src/environments/environment.development.ts`). Playwright intercepts
 * requests to this origin at the network layer, so no backend needs to run.
 */
export const API_BASE_URL = 'http://localhost:8000';

/**
 * Fulfils a Playwright route with a JSON body and default JSON-LD headers.
 */
async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/ld+json',
    body: JSON.stringify(body),
  });
}

/**
 * ApiMock
 *
 * Thin network-mock helper wrapping `page.route` for every backend endpoint
 * the app calls during boot, login, and dashboard landing. Each method
 * intercepts one endpoint and keeps a small piece of mutable state so specs
 * can assert on call counts / bodies without re-deriving Playwright route
 * matchers every time.
 *
 * Usage:
 * ```ts
 * const api = new ApiMock(page);
 * await api.mockUnauthenticatedSession();
 * await api.mockLogin();
 * await page.goto('/auth/login');
 * ```
 */
export class ApiMock {
  private readonly page: Page;
  private loginRequestCount = 0;
  private safetyNetInstalled = false;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Number of times POST /api/auth/login was called during this test. */
  public get loginCallCount(): number {
    return this.loginRequestCount;
  }

  /**
   * Registers a catch-all 404 for any `/api/*` request not covered by a more
   * specific mock, so an un-mocked endpoint fails fast instead of hanging
   * while Playwright waits on a backend that never runs in these tests.
   * Playwright matches routes last-registered-first, so specific mocks
   * registered afterwards always win over this fallback.
   */
  private async installSafetyNet(): Promise<void> {
    if (this.safetyNetInstalled) return;
    this.safetyNetInstalled = true;

    await this.page.route(`${API_BASE_URL}/api/**`, async (route) => {
      await fulfillJson(route, 404, {
        '@id': '/errors/not-mocked',
        '@type': 'Error',
        status: 404,
        type: 'about:blank',
        title: `No E2E mock registered for ${route.request().method()} ${route.request().url()}`,
      });
    });
    await this.page.route('http://localhost:3000/.well-known/mercure**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' });
    });
  }

  /**
   * Mocks `POST /api/auth/refresh` to fail (no session cookie), which is the
   * default state for a fresh browser context. Auth-page tests should call
   * this before navigating so the boot sequence resolves quickly to "logged out".
   */
  public async mockUnauthenticatedSession(): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/refresh`, async (route) => {
      await fulfillJson(route, 401, { message: 'Unauthorized' });
    });
  }

  /**
   * Mocks everything a logged-in session needs downstream of authentication:
   * /api/me -> notifications -> onboarding -> organizations. Does NOT touch
   * `/api/auth/refresh` so it composes with either `mockAuthenticatedSession`
   * (session already restored on boot) or a post-login flow where the login
   * response itself provides the token (`mockLoginSuccess` + this method).
   */
  public async mockSessionData(options?: {
    profile?: Partial<UserProfileOutputFixture>;
    onboarding?: Partial<OnboardingOutputFixture>;
    organizations?: ReadonlyArray<OrganizationOutputFixture>;
  }): Promise<void> {
    await this.installSafetyNet();

    const profile: UserProfileOutputFixture = userProfileOutput(options?.profile);
    const onboarding: OnboardingOutputFixture = onboardingOutput(options?.onboarding);
    const organizations: ReadonlyArray<OrganizationOutputFixture> = options?.organizations ?? [
      organizationOutput(),
    ];

    await this.page.route(`${API_BASE_URL}/api/me`, async (route) => {
      await fulfillJson(route, 200, profile);
    });
    await this.page.route(`${API_BASE_URL}/api/notifications/subscription`, async (route) => {
      await fulfillJson(route, 200, mercureSubscriptionOutput());
    });
    await this.page.route(/\/api\/notifications(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(`${API_BASE_URL}/api/onboarding/organization`, async (route) => {
      await fulfillJson(route, 200, onboarding);
    });
    await this.page.route(/\/api\/organizations(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection(organizations));
    });
  }

  /**
   * Mocks the full authenticated-session bootstrap burst so a test can load
   * any dashboard route as an already-logged-in user:
   * refresh -> /api/me -> notifications -> onboarding -> organizations.
   */
  public async mockAuthenticatedSession(options?: {
    profile?: Partial<UserProfileOutputFixture>;
    onboarding?: Partial<OnboardingOutputFixture>;
    organizations?: ReadonlyArray<OrganizationOutputFixture>;
  }): Promise<void> {
    await this.installSafetyNet();

    const refresh: LoginOutputFixture = loginOutput();
    await this.page.route(`${API_BASE_URL}/api/auth/refresh`, async (route) => {
      await fulfillJson(route, 200, refresh);
    });
    await this.mockSessionData(options);
  }

  /**
   * Mocks `POST /api/auth/login` to succeed with the given credentials and
   * counts calls so specs can assert on submission behavior.
   */
  public async mockLoginSuccess(overrides: Partial<LoginOutputFixture> = {}): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/login`, async (route) => {
      this.loginRequestCount += 1;
      await fulfillJson(route, 200, loginOutput(overrides));
    });
  }

  /** Mocks `POST /api/auth/login` to return MFA-required. */
  public async mockLoginMfaRequired(overrides: Partial<LoginOutputFixture> = {}): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/login`, async (route) => {
      this.loginRequestCount += 1;
      await fulfillJson(route, 200, mfaRequiredLoginOutput(overrides));
    });
  }

  /** Mocks `POST /api/auth/login` to fail with invalid-credentials (401). */
  public async mockLoginFailure(status = 401, detail = 'Invalid credentials'): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/login`, async (route) => {
      this.loginRequestCount += 1;
      await fulfillJson(route, status, {
        '@id': '/errors/login',
        '@type': 'Error',
        status,
        type: 'about:blank',
        title: detail,
        detail,
      });
    });
  }

  /**
   * Mocks `POST /api/auth/register` to succeed with a challenge token, which
   * is what drives `RegisterStore.hasChallenge()` and the page's navigation
   * to `/auth/register/verify` (`registerVerifyGuard` reads the same signal).
   */
  public async mockRegisterSuccess(overrides: Partial<ChallengeOutputFixture> = {}): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/register`, async (route) => {
      await fulfillJson(
        route,
        201,
        challengeOutput({ challengeToken: 'e2e-register-challenge-token', ...overrides }),
      );
    });
  }

  /** Mocks `POST /api/auth/register` to fail with a conflict (email taken). */
  public async mockRegisterConflict(): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/register`, async (route) => {
      await fulfillJson(route, 409, {
        '@id': '/errors/register',
        '@type': 'Error',
        status: 409,
        type: 'about:blank',
        title: 'An account already exists for this email.',
        detail: 'An account already exists for this email.',
      });
    });
  }

  /** Mocks `POST /api/auth/register/verify` to succeed and apply an authenticated session. */
  public async mockRegisterVerifySuccess(
    overrides: Partial<LoginOutputFixture> = {},
  ): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/register/verify`, async (route) => {
      await fulfillJson(route, 200, loginOutput(overrides));
    });
  }

  /** Mocks `POST /api/auth/register/verify` to fail with an invalid code. */
  public async mockRegisterVerifyFailure(detail = 'Invalid verification code'): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/register/verify`, async (route) => {
      await fulfillJson(route, 400, {
        '@id': '/errors/register-verify',
        '@type': 'Error',
        status: 400,
        type: 'about:blank',
        title: detail,
        detail,
      });
    });
  }

  /** Mocks `POST /api/auth/register/resend` to succeed with a fresh challenge token. */
  public async mockRegisterResendSuccess(
    overrides: Partial<ChallengeOutputFixture> = {},
  ): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/register/resend`, async (route) => {
      await fulfillJson(
        route,
        200,
        challengeOutput({ challengeToken: 'e2e-register-challenge-token-2', ...overrides }),
      );
    });
  }

  /** Mocks `POST /api/auth/mfa/verify` to succeed and apply an authenticated session. */
  public async mockMfaVerifySuccess(overrides: Partial<LoginOutputFixture> = {}): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/mfa/verify`, async (route) => {
      await fulfillJson(route, 200, loginOutput(overrides));
    });
  }

  /** Mocks `POST /api/auth/mfa/verify` to fail with an invalid code. */
  public async mockMfaVerifyFailure(detail = 'Invalid verification code'): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/mfa/verify`, async (route) => {
      await fulfillJson(route, 400, {
        '@id': '/errors/mfa-verify',
        '@type': 'Error',
        status: 400,
        type: 'about:blank',
        title: detail,
        detail,
      });
    });
  }

  /** Mocks `POST /api/auth/mfa/resend` to succeed with fresh MFA/challenge tokens. */
  public async mockMfaResendSuccess(overrides: Partial<LoginOutputFixture> = {}): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/mfa/resend`, async (route) => {
      await fulfillJson(
        route,
        200,
        mfaRequiredLoginOutput({
          mfa_token: 'e2e-mfa-token-2',
          challenge_token: 'e2e-challenge-token-2',
          ...overrides,
        }),
      );
    });
  }

  /**
   * Mocks `POST /api/auth/password/reset/request` to succeed with a challenge
   * token, which drives navigation to `/auth/password-reset/verify`.
   */
  public async mockPasswordResetRequestSuccess(
    overrides: Partial<ChallengeOutputFixture> = {},
  ): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/password/reset/request`, async (route) => {
      await fulfillJson(
        route,
        200,
        challengeOutput({ challengeToken: 'e2e-reset-challenge-token', ...overrides }),
      );
    });
  }

  /** Mocks `POST /api/auth/password/reset/confirm` to succeed. */
  public async mockPasswordResetConfirmSuccess(
    overrides: Partial<ChallengeOutputFixture> = {},
  ): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/password/reset/confirm`, async (route) => {
      await fulfillJson(route, 200, challengeOutput(overrides));
    });
  }

  /** Mocks `POST /api/auth/password/reset/confirm` to fail with an invalid code. */
  public async mockPasswordResetConfirmFailure(
    detail = 'Invalid verification code',
  ): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/password/reset/confirm`, async (route) => {
      await fulfillJson(route, 400, {
        '@id': '/errors/password-reset-confirm',
        '@type': 'Error',
        status: 400,
        type: 'about:blank',
        title: detail,
        detail,
      });
    });
  }

  /** Mocks `POST /api/auth/password/reset/resend` to succeed with a fresh challenge token. */
  public async mockPasswordResetResendSuccess(
    overrides: Partial<ChallengeOutputFixture> = {},
  ): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/password/reset/resend`, async (route) => {
      await fulfillJson(
        route,
        200,
        challengeOutput({ challengeToken: 'e2e-reset-challenge-token-2', ...overrides }),
      );
    });
  }

  /** Mocks `POST /api/auth/logout` to succeed. */
  public async mockLogoutSuccess(): Promise<void> {
    await this.page.route(`${API_BASE_URL}/api/auth/logout`, async (route) => {
      await fulfillJson(route, 200, { '@id': '/api/auth/logout', '@type': 'LogoutResult' });
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/me` — the effective
   * roles/permissions payload consumed by `organizationAccessGuard`,
   * `organizationLandingGuard`, and `organizationPermissionGuard`. Defaults to
   * every `ORGANIZATION_PERMISSION` value granted; pass `permissions` to test
   * a permission-denied redirect.
   */
  public async mockOrganizationAccess(
    organizationId: string,
    overrides: Partial<CurrentOrganizationMemberProfileOutputFixture> & {
      permissions?: ReadonlyArray<string>;
    } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/me`,
      async (route) => {
        await fulfillJson(
          route,
          200,
          currentOrganizationMemberProfileOutput({ organizationId, ...overrides }),
        );
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}` — the resource loaded by
   * `organizationResolver` when entering the `:organizationId` route subtree.
   */
  public async mockOrganizationDetail(
    organization: OrganizationOutputFixture = organizationOutput(),
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/organizations/${organization.id}`, async (route) => {
      await fulfillJson(route, 200, organization);
    });
  }
}
