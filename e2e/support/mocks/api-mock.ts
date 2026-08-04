import type { Page, Route } from '@playwright/test';
import {
  apiError,
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
import type { EquipmentOutputFixture } from '../fixtures/equipment-fixtures';
import type { FacilityOutputFixture } from '../fixtures/facility-fixtures';
import type { InspectionOutputFixture } from '../fixtures/inspection-fixtures';
import {
  interventionActivityOutput,
  interventionOutput,
  interventionWorkItemOutput,
  type InterventionChangeOutputFixture,
  type InterventionOutputFixture,
  type InterventionWorkItemOutputFixture,
} from '../fixtures/intervention-fixtures';

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
  private equipmentReplayRequestCount = 0;
  private commentCreateRequestCount = 0;
  private safetyNetInstalled = false;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Number of times POST /api/auth/login was called during this test. */
  public get loginCallCount(): number {
    return this.loginRequestCount;
  }

  /**
   * Number of times an offline equipment create was replayed (PUT
   * /api/equipment/{clientId}). Proves the sync engine actually attempted a
   * replay for the transient-retry scenario, where the outbox otherwise looks
   * unchanged.
   */
  public get equipmentCreateReplayCount(): number {
    return this.equipmentReplayRequestCount;
  }

  /** Number of times POST /api/interventions/{id}/comments was called (online post or replay). */
  public get commentCreateCount(): number {
    return this.commentCreateRequestCount;
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

    await Promise.all(
      organizations.flatMap((organization: OrganizationOutputFixture) => [
        this.mockOrganizationDetail(organization),
        this.mockOrganizationAccess(organization.id),
      ]),
    );
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

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities/{facility.id}` —
   * the resource loaded by `facilityResolver` for the facility detail/edit routes.
   */
  public async mockFacilityDetail(
    organizationId: string,
    facility: FacilityOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/facilities/${facility.id}`,
      async (route) => {
        await fulfillJson(route, 200, facility);
      },
    );
  }

  /**
   * Mocks the facility-scoped equipment and inspection previews the detail
   * page's Overview tab reads (`FacilityOverviewStore`). Both `EquipmentService.list`
   * and `InspectionService.list` route a `facilityId` filter to these
   * facility-scoped collection endpoints rather than the organization-wide ones.
   */
  public async mockFacilityOverview(
    organizationId: string,
    facilityId: string,
    options: {
      equipment?: ReadonlyArray<EquipmentOutputFixture>;
      inspections?: ReadonlyArray<InspectionOutputFixture>;
    } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/facilities/${facilityId}/equipment(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(options.equipment ?? []));
      },
    );
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/facilities/${facilityId}/inspections(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(options.inspections ?? []));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/equipment/{equipment.id}` —
   * the resource loaded by `equipmentResolver` for the equipment detail/edit routes.
   */
  public async mockEquipmentDetail(
    organizationId: string,
    equipment: EquipmentOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/equipment/${equipment.id}`,
      async (route) => {
        await fulfillJson(route, 200, equipment);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/inspections/{inspection.id}` —
   * the resource loaded by `inspectionResolver` for the inspection detail/edit routes.
   */
  public async mockInspectionDetail(
    organizationId: string,
    inspection: InspectionOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/inspections/${inspection.id}`,
      async (route) => {
        await fulfillJson(route, 200, inspection);
      },
    );
  }

  /**
   * Mocks `GET /api/interventions/{id}` — consumed by the title resolver, the
   * active-intervention store, and the workspace `forkJoin`. Served repeatably.
   */
  public async mockInterventionDetail(
    intervention: InterventionOutputFixture = interventionOutput(),
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/interventions/${intervention.id}`, async (route) => {
      await fulfillJson(route, 200, intervention);
    });
  }

  /**
   * Mocks `GET /api/interventions` — the collection the list page reads for
   * every one of its views.
   *
   * The board and the calendar share this one endpoint: the list store reads it
   * paginated, the calendar store reads it again windowed by `plannedStartAt`.
   * A single matcher therefore serves both, which is also what lets a spec
   * switch views without re-mocking.
   */
  public async mockInterventionList(
    interventions: ReadonlyArray<InterventionOutputFixture> = [interventionOutput()],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/interventions(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection(interventions));
    });
  }

  /**
   * Mocks the four workspace collection reads (`work-items`, `changes`,
   * `issues`, `activities`) — `workItems` and `changes` default to empty,
   * enough for the detail page to render its execute-phase workspace without
   * any 404s; pass either to populate the checklist or the review phase's
   * proposed-changes diff list.
   */
  public async mockInterventionWorkspace(
    interventionId: string,
    options: {
      workItems?: ReadonlyArray<InterventionWorkItemOutputFixture>;
      changes?: ReadonlyArray<InterventionChangeOutputFixture>;
    } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    const workItems = options.workItems ?? [];
    const changes = options.changes ?? [];
    await this.page.route(/\/api\/intervention-work-items(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection(workItems));
    });
    await this.page.route(/\/api\/intervention-changes(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection(changes));
    });
    await this.page.route(
      `${API_BASE_URL}/api/interventions/${interventionId}/issues`,
      async (route) => {
        await fulfillJson(route, 200, hydraCollection([]));
      },
    );
    await this.page.route(
      new RegExp(`/api/interventions/${interventionId}/activities(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection([]));
      },
    );
  }

  /**
   * Mocks the six planning-option reads the detail page's
   * `InterventionPlanningOptionsStore` loads (facilities x2 by query, equipment,
   * equipment-types, members, intervention-labels) as empty collections.
   */
  public async mockInterventionPlanningOptions(organizationId: string): Promise<void> {
    await this.installSafetyNet();
    const empty = async (route: Route): Promise<void> =>
      fulfillJson(route, 200, hydraCollection([]));
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/equipment-types(\\?.*)?$`),
      empty,
    );
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/facilities(\\?.*)?$`),
      empty,
    );
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/equipment(\\?.*)?$`),
      empty,
    );
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/members(\\?.*)?$`),
      empty,
    );
    await this.page.route(/\/api\/intervention-labels(\?.*)?$/, empty);
  }

  /**
   * Mocks `POST /api/interventions/{id}/comments` (online post and offline
   * replay of a `comment.create` operation) to succeed with a created activity.
   * Counts calls so a spec can prove the comment was actually posted.
   */
  public async mockCommentCreate(interventionId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/interventions/${interventionId}/comments`,
      async (route) => {
        this.commentCreateRequestCount += 1;
        await fulfillJson(
          route,
          201,
          interventionActivityOutput({ intervention: `/api/interventions/${interventionId}` }),
        );
      },
    );
  }

  /**
   * Mocks `POST /api/interventions/{id}/comments` to fail at the network layer
   * (a status-0 error), simulating "online but unreachable" — a captive portal
   * or dropped connection where `navigator.onLine` stays true. Drives the
   * store's `isNetworkFailure` queue fallback (IF-5).
   */
  public async mockCommentCreateNetworkError(interventionId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/interventions/${interventionId}/comments`,
      async (route) => {
        this.commentCreateRequestCount += 1;
        await route.abort('failed');
      },
    );
  }

  /**
   * Mocks the replay of an offline equipment create (`PUT /api/equipment/{clientId}`)
   * to return the given status: a 4xx to make it a permanent failure, a 5xx to
   * make it a transient one, or a 2xx to succeed. Pass `problemType` (with a
   * 409/412 status) to return an RFC7807 body whose `type` marks the resource as
   * already applied, which the sync engine treats as an idempotent dequeue.
   * Counts attempts so a spec can prove the replay ran.
   */
  public async mockEquipmentCreateReplay(
    status: number,
    options: { problemType?: string } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/equipment\/[^/?]+(\?.*)?$/, async (route) => {
      this.equipmentReplayRequestCount += 1;
      if (status >= 200 && status < 300) {
        await fulfillJson(route, status, {
          '@id': '/api/equipment/e2e-created',
          '@type': 'Equipment',
          id: 'e2e-created',
        });
        return;
      }
      await fulfillJson(
        route,
        status,
        apiError({
          status,
          type: options.problemType ?? 'about:blank',
          title: status >= 500 ? 'Temporary server error' : 'Rejected',
          detail:
            status >= 500 ? 'The server is temporarily unavailable.' : 'The equipment is invalid.',
        }),
      );
    });
  }

  /**
   * Mocks the replay of an offline work-item status change
   * (`PATCH /api/intervention-work-items/{id}`) to succeed, so a queued
   * `work-item.update` drains on reconnect.
   */
  public async mockWorkItemUpdateReplay(): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/intervention-work-items\/[^/?]+(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, interventionWorkItemOutput());
    });
  }

  /**
   * Mocks `/api/interventions/{id}` for the 412-rebase scenario: `GET` always
   * returns the current server revision, while `PATCH` returns `412` for any
   * `If-Match` other than the current revision (a stale replay) and `200` once
   * the operation has been rebased onto it (a successful retry).
   */
  public async mockInterventionUpdateRebase(
    interventionId: string,
    currentRevision: number,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/interventions/${interventionId}`, async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        const ifMatch = request.headers()['if-match'];
        if (ifMatch === `"revision-${currentRevision}"`) {
          await fulfillJson(
            route,
            200,
            interventionOutput({ id: interventionId, revision: currentRevision + 1 }),
          );
          return;
        }
        await fulfillJson(
          route,
          412,
          apiError({
            status: 412,
            title: 'Precondition failed',
            detail: 'The intervention changed.',
          }),
        );
        return;
      }
      await fulfillJson(
        route,
        200,
        interventionOutput({ id: interventionId, revision: currentRevision }),
      );
    });
  }
}
