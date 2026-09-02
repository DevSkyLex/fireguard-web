import type { Page, Route } from '@playwright/test';
import {
  currentOrganizationMemberProfileOutput,
  hydraCollection,
  loginOutput,
  onboardingOutput,
  organizationOutput,
  organizationNavigationCountersOutput,
  optionOutput,
  mercureSubscriptionOutput,
  notificationOutput,
  userProfileOutput,
  type CurrentOrganizationMemberProfileOverrides,
  type LoginOutputFixture,
  type NotificationOutputFixture,
  type OnboardingOutputFixture,
  type OnboardingStepKeyFixture,
  type OptionFixture,
  type OrganizationOutputFixture,
  type RegisterOutputFixture,
  type UserProfileOutputFixture,
  type TrustDeviceOutputFixture,
} from '../fixtures/api-fixtures';
import type { ApiErrorFixture } from '../fixtures/api-fixtures';
import type {
  ApprovalActionTypeOutputFixture,
  ApprovalRequestOutputFixture,
} from '../fixtures/approval-fixtures';
import type { AuditEventOutputFixture } from '../fixtures/audit-fixtures';
import type {
  InvoiceOutputFixture,
  OrganizationQuotaOutputFixture,
  OrganizationSubscriptionOutputFixture,
  PlanOutputFixture,
  PlanPricingOutputFixture,
} from '../fixtures/billing-fixtures';
import {
  messageOutput,
  type ChannelOutputFixture,
  type ChannelParticipantOutputFixture,
  type ConversationOutputFixture,
  type MessageOutputFixture,
} from '../fixtures/channel-fixtures';
import type {
  ComplianceFacilityTreeOutputFixture,
  ComplianceSummaryOutputFixture,
} from '../fixtures/compliance-fixtures';
import type {
  OrganizationDashboardOutputFixture,
  OrganizationDashboardTrendOutputFixture,
} from '../fixtures/dashboard-fixtures';
import { equipmentKpiOutput, type EquipmentKpiFixture } from '../fixtures/equipment-fixtures';
import type { EquipmentOutputFixture } from '../fixtures/equipment-fixtures';
import { facilityAttachmentOutput } from '../fixtures/facility-fixtures';
import type {
  ComplianceTreeNodeOutputFixture,
  FacilityAttachmentOutputFixture,
  FacilityOutputFixture,
  FacilityPlanOverlayOutputFixture,
} from '../fixtures/facility-fixtures';
import type { ImportJobOutputFixture } from '../fixtures/import-fixtures';
import type { InspectionOutputFixture } from '../fixtures/inspection-fixtures';
import type {
  InterventionIssueOutputFixture,
  InterventionLabelOutputFixture,
  InterventionOutputFixture,
  InterventionRecurrenceOutputFixture,
  InterventionStatisticsOutputFixture,
  InterventionTemplateOutputFixture,
  InterventionWorkItemOutputFixture,
} from '../fixtures/intervention-fixtures';
import type {
  OrganizationInvitationPreviewOutputFixture,
  OrganizationMemberOutputFixture,
} from '../fixtures/invitation-fixtures';
import type { MaintenanceScheduleOutputFixture } from '../fixtures/maintenance-fixtures';
import type { OrganizationInvitationOutputFixture } from '../fixtures/member-fixtures';
import type {
  OrganizationPermissionOutputFixture,
  OrganizationRoleOutputFixture,
} from '../fixtures/role-fixtures';

/**
 * Backend origin the app is configured to call in the `e2e` build
 * (`src/environments/environment.development.ts`). Playwright intercepts
 * requests to this origin at the network layer, so no backend needs to run.
 */
export const API_BASE_URL = 'http://localhost:8000';

/** A 1×1 transparent PNG, served for every mocked facility attachment download. */
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

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
 * exercised by the equipments/facilities/inspections/onboarding e2e specs —
 * the session bootstrap burst every authenticated route needs, plus one
 * method per organization-scoped collection/resource these four features
 * read or resolve through.
 *
 * Usage:
 * ```ts
 * const api = new ApiMock(page);
 * await api.mockAuthenticatedSession();
 * await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput()]);
 * await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/equipments`);
 * ```
 */
export class ApiMock {
  private readonly page: Page;
  private safetyNetInstalled = false;

  public constructor(page: Page) {
    this.page = page;
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
   * (session already restored on boot) or a post-login flow.
   */
  public async mockSessionData(options?: {
    profile?: Partial<UserProfileOutputFixture>;
    onboarding?: Partial<OnboardingOutputFixture>;
    organizations?: ReadonlyArray<OrganizationOutputFixture>;
    notifications?: ReadonlyArray<NotificationOutputFixture>;
    unreadCount?: number;
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
    const notifications: ReadonlyArray<NotificationOutputFixture> = options?.notifications ?? [];
    await this.page.route(/\/api\/notifications(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection([...notifications]));
    });
    await this.page.route(/\/api\/notifications\/[^/]+\/read$/, async (route) => {
      const id: string = route.request().url().split('/').at(-2) ?? '';
      const target: NotificationOutputFixture | undefined = notifications.find(
        (notification) => notification.id === id,
      );
      await fulfillJson(route, 200, { ...(target ?? notificationOutput({ id })), isRead: true });
    });
    await this.page.route(/\/api\/inbox\/unread-count(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, { unreadCount: options?.unreadCount ?? 0 });
    });
    // The collaboration sidebar loads on every workspace-shell route; without
    // these, the channel section renders its error state and the DM store
    // surfaces a raw-HTTP error toast that races into screenshots.
    await this.page.route(/\/api\/channels(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/direct-conversations(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(`${API_BASE_URL}/api/presence`, async (route) => {
      await fulfillJson(route, 200, {});
    });
    // `provideInterventionsFeature()` starts `InterventionPrefetchService` at
    // app boot, browser-only and independent of the visited route — it reads
    // the current member profile then lists interventions `responsible=` them
    // for offline warm-caching. Every authenticated session hits this once.
    await this.page.route(/\/api\/interventions(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection([]));
    });
    // `MemberDirectoryStore` (bound to `MEMBER_DIRECTORY_PORT` by
    // `provideOrganizationFeature()`) reads the member directory from
    // somewhere in the dashboard shell chrome, independent of the visited
    // organization subfeature — observed firing at the 375px viewport.
    await this.page.route(/\/api\/organizations\/[^/]+\/members(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection([]));
    });
    // The workspace shell badges its sidebar entries from
    // `OrganizationNavigationCountersStore`, which fires on every organization
    // route regardless of the visited subfeature. Un-mocked it hits the
    // safety net and puts a 404 in the console, which the dark-mode
    // "no console errors" specs assert against.
    await this.page.route(
      /\/api\/organizations\/[^/]+\/navigation-counters(\?.*)?$/,
      async (route) => {
        await fulfillJson(route, 200, organizationNavigationCountersOutput());
      },
    );
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
    notifications?: ReadonlyArray<NotificationOutputFixture>;
    unreadCount?: number;
  }): Promise<void> {
    await this.installSafetyNet();

    const refresh: LoginOutputFixture = loginOutput();
    await this.page.route(`${API_BASE_URL}/api/auth/refresh`, async (route) => {
      await fulfillJson(route, 200, refresh);
    });
    await this.mockSessionData(options);
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/me` — the effective
   * roles/permissions payload consumed by `organizationAccessGuard`,
   * `organizationLandingGuard`, and `organizationPermissionGuard`. Defaults to
   * every `ORGANIZATION_PERMISSION` value granted; pass `permissions` to test
   * a permission-denied redirect (e.g. hiding "New equipment"/"New facility").
   */
  public async mockOrganizationAccess(
    organizationId: string,
    overrides: CurrentOrganizationMemberProfileOverrides = {},
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
   * Mocks `GET /api/onboarding/organization`, overriding the completed
   * default every `mock*Session*` call installs. Register this AFTER
   * `mockAuthenticatedSession`: Playwright matches routes
   * last-registered-first, so this specific record wins for onboarding-guard
   * and wizard-rendering specs without touching the shared session baseline.
   */
  public async mockOnboarding(onboarding: OnboardingOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/onboarding/organization`, async (route) => {
      await fulfillJson(route, 200, onboarding);
    });
  }

  /**
   * Mocks a successful `POST /api/auth/login` — the sign-in submit. Pass a
   * `loginOutput({ mfa_required: true, ... })` fixture to exercise the MFA
   * hand-off instead of a plain sign-in.
   */
  public async mockLogin(response: LoginOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/login`, async (route) => {
      await fulfillJson(route, 200, response);
    });
  }

  /**
   * Mocks a failing `POST /api/auth/login` — invalid credentials. The login
   * page shows the feedback the form/toast owns; this only proves the request
   * failed and the app stayed on `/auth/login`.
   */
  public async mockLoginError(error: Partial<ApiErrorFixture> = {}): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/login`, async (route) => {
      await fulfillJson(route, error.status ?? 401, {
        '@id': '/errors/login-failed',
        '@type': 'Error',
        status: 401,
        type: 'about:blank',
        title: 'Invalid email or password.',
        detail: 'Invalid email or password.',
        ...error,
      });
    });
  }

  /**
   * Mocks `POST /api/auth/mfa/verify` — the second-factor submit that
   * completes the session `mockLogin`'s `mfa_required` response started.
   */
  public async mockMfaVerify(response: LoginOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/mfa/verify`, async (route) => {
      await fulfillJson(route, 200, response);
    });
  }

  /**
   * Mocks `POST /api/trusted-devices` — the device-trust request `AuthStore`
   * issues after a successful MFA verify when the operator ticked "Trust this
   * device". The real backend answers with a cookie the mock cannot set, so a
   * spec proves the request left, not that the next login skips MFA.
   */
  public async mockTrustDevice(response: TrustDeviceOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/trusted-devices`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 201, response);
    });
  }

  /**
   * Mocks `POST /api/auth/mfa/resend` — a new code for the same challenge.
   */
  public async mockMfaResend(response: LoginOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/mfa/resend`, async (route) => {
      await fulfillJson(route, 200, response);
    });
  }

  /**
   * Mocks `POST /api/auth/register` — account creation, returning the
   * challenge token `register/verify` needs next.
   */
  public async mockRegister(response: RegisterOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/register`, async (route) => {
      await fulfillJson(route, 201, response);
    });
  }

  /**
   * Mocks `POST /api/auth/register/verify` — the OTP that activates the
   * account and auto-logs the visitor in, shaped like a login response.
   */
  public async mockRegisterVerify(response: LoginOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/register/verify`, async (route) => {
      await fulfillJson(route, 200, response);
    });
  }

  /**
   * Mocks `POST /api/auth/register/resend` — a new verification code,
   * returning a fresh challenge token that must replace the old one.
   */
  public async mockRegisterResend(response: RegisterOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/register/resend`, async (route) => {
      await fulfillJson(route, 200, response);
    });
  }

  /**
   * Mocks a successful `POST /api/onboarding/organization/steps/{stepKey}/execute`
   * — the wizard's step-confirm call. Pass the onboarding record as the
   * server would return it post-execution (advanced `nextStep`, updated
   * `completedSteps`).
   */
  public async mockOnboardingStepExecute(
    stepKey: OnboardingStepKeyFixture,
    onboarding: OnboardingOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/onboarding/organization/steps/${stepKey}/execute`,
      async (route) => {
        await fulfillJson(route, 200, onboarding);
      },
    );
  }

  /**
   * Mocks a successful `POST /api/onboarding/organization/steps/{stepKey}/skip`
   * — the wizard's "Skip for now" action. Pass the onboarding record as the
   * server would return it post-skip (advanced `nextStep`, updated
   * `skippedSteps`).
   */
  public async mockOnboardingStepSkip(
    stepKey: OnboardingStepKeyFixture,
    onboarding: OnboardingOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/onboarding/organization/steps/${stepKey}/skip`,
      async (route) => {
        await fulfillJson(route, 200, onboarding);
      },
    );
  }

  /**
   * Mocks a successful `POST /api/organizations` — the wizard's
   * `create_organization` step and any other organization-creation flow.
   * Method-checked and meant to be registered alongside a collection mock
   * (e.g. `mockSessionData`'s own `/api/organizations` route), which it falls
   * back to for `GET`.
   */
  public async mockOrganizationCreate(organization: OrganizationOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/organizations(\\?.*)?$'), async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 201, organization);
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/equipment` — the
   * collection the equipments list page and the inspection create page's
   * equipment combobox (`InspectionCreationOptionsStore`) both read.
   */
  public async mockEquipmentList(
    organizationId: string,
    equipment: ReadonlyArray<EquipmentOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/equipment(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(equipment));
      },
    );
  }

  /**
   * Mocks a successful `POST /api/organizations/{organizationId}/equipment`
   * — the onboarding wizard's `create_first_equipment` step and any other
   * equipment-creation flow. Method-checked so it composes with
   * `mockEquipmentList` on the same path, falling back to it for `GET`.
   */
  public async mockEquipmentCreate(
    organizationId: string,
    equipment: EquipmentOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/equipment(\\?.*)?$`),
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, 201, equipment);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/equipment/{equipment.id}` —
   * the resource seeded by `equipmentResolver` for the equipment detail route.
   * Pass `holdUntil` to keep the response pending until the promise resolves,
   * simulating a slow connection deterministically (no sleeps): assert the
   * skeleton while held, release, then assert the content.
   */
  public async mockEquipmentDetail(
    organizationId: string,
    equipment: EquipmentOutputFixture,
    options: { holdUntil?: Promise<void> } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/equipment/${equipment.id}`,
      async (route) => {
        if (options.holdUntil) await options.holdUntil;
        await fulfillJson(route, 200, equipment);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/equipment/kpis` — the KPI
   * strip above the equipment list, read by `EquipmentKpisStore`.
   */
  public async mockEquipmentKpis(
    organizationId: string,
    kpis: Partial<EquipmentKpiFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/equipment/kpis(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, equipmentKpiOutput(kpis));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/legal-types` — the reference catalog behind
   * the settings Legal information type picker.
   */
  public async mockOrganizationLegalTypes(
    options: ReadonlyArray<OptionFixture> = [
      optionOutput({ value: 'sas', label: 'SAS' }),
      optionOutput({ value: 'sarl', label: 'SARL' }),
    ],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/organizations\/legal-types(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection(options));
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities` — the
   * roots-only collection `FacilityStore.loadRootFacilities` reads, and the
   * parent-facility combobox on the create form (`FacilityStore.listAll`).
   */
  public async mockFacilityList(
    organizationId: string,
    facilities: ReadonlyArray<FacilityOutputFixture> = [],
    options: { totalItems?: number } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/facilities(\\?.*)?$`),
      async (route) => {
        await fulfillJson(
          route,
          200,
          hydraCollection(facilities, { totalItems: options.totalItems ?? facilities.length }),
        );
      },
    );
  }

  /**
   * Mocks a successful `POST /api/organizations/{organizationId}/facilities`
   * — the onboarding wizard's `create_first_facility` step and any other
   * facility-creation flow. Method-checked so it composes with
   * `mockFacilityList` on the same path, falling back to it for `GET`.
   */
  public async mockFacilityCreate(
    organizationId: string,
    facility: FacilityOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/facilities(\\?.*)?$`),
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, 201, facility);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities` for the map
   * surface's two shapes of the same collection: `hasCoordinates=true`
   * (`FacilityMapStore.loadMapped`, read as the full member list) and
   * `hasCoordinates=false` (`FacilityMapStore.loadUnplacedCount`, read only
   * for `totalItems` off a single-item page). A request carrying neither
   * query param falls through to a 404 via the safety net, matching this
   * page's actual traffic.
   */
  public async mockFacilityMap(
    organizationId: string,
    located: ReadonlyArray<FacilityOutputFixture>,
    unplacedCount = 0,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/facilities\\?.*hasCoordinates=true`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(located));
      },
    );
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/facilities\\?.*hasCoordinates=false`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection([], { totalItems: unplacedCount }));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facility-tree` — the
   * Compliance-owned tree the facility map's compliance layer loads lazily
   * on the first toggle-on (`FacilityMapStore.loadCompliance`).
   */
  public async mockComplianceTree(
    organizationId: string,
    nodes: ReadonlyArray<ComplianceTreeNodeOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/facility-tree`,
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(nodes));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities/{facility.id}` —
   * the resource seeded by `facilityResolver` for the facility detail route.
   * Pass `holdUntil` to keep the response pending until the promise resolves,
   * simulating a slow connection deterministically (no sleeps): assert the
   * skeleton while held, release, then assert the content.
   *
   * Also stubs `GET /api/interventions` with an empty collection: the detail
   * page's Overview tab always loads its "Interventions on this site"
   * section, and an unmocked call would land on the 404 safety net. A spec
   * exercising that section registers its own interventions route afterwards
   * and wins by Playwright's last-registered-first matching.
   */
  public async mockFacilityDetail(
    organizationId: string,
    facility: FacilityOutputFixture,
    options: { holdUntil?: Promise<void> } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/facilities/${facility.id}`,
      async (route) => {
        if (options.holdUntil) await options.holdUntil;
        await fulfillJson(route, 200, facility);
      },
    );
    await this.page.route(new RegExp('/api/interventions(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection([]));
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities/{facility.id}/descendants` —
   * the flat subtree `FacilityStore.ensureFacilityDescendantsLoaded` fetches
   * once, when `facility.hasChildren` is `true`, to feed the Overview tab's
   * hierarchy chart.
   */
  public async mockFacilityDescendants(
    organizationId: string,
    facilityId: string,
    descendants: ReadonlyArray<FacilityOutputFixture>,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/facilities/${facilityId}/descendants(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(descendants));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities/{facility.id}/children` —
   * the one-branch-at-a-time collection the assets explorer's `FacilityTreeStore`
   * fetches when a tree node is expanded, and the direct-children collection
   * `FacilityPlansStore.ensureZoneCandidatesLoaded` fetches for the plan
   * editor's `draw-zone` picker.
   */
  public async mockFacilityChildren(
    organizationId: string,
    facilityId: string,
    children: ReadonlyArray<FacilityOutputFixture>,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/facilities/${facilityId}/children(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(children));
      },
    );
  }

  /**
   * Mocks `POST /api/organizations/{organizationId}/facilities/{facilityId}/move`
   * — `FacilityTreeStore.move`, called from both the assets explorer tree's
   * pointer drag-drop and its `FacilityMoveDialog` "Move to…" action. Pass
   * the fixture as the server would return it post-move (updated
   * `parentFacilityId`).
   */
  public async mockFacilityMove(
    organizationId: string,
    facilityId: string,
    moved: FacilityOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/facilities/${facilityId}/move`,
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, 200, moved);
      },
    );
  }

  /**
   * Mocks `PUT /api/organizations/{organizationId}/facilities/{facilityId}/plan-geometry` —
   * the plan editor's zone-outline write. `onRequestBody`, when given, is
   * invoked with the parsed request body so a spec can assert what
   * `FacilityService.setPlanGeometry` sent.
   */
  public async mockFacilityPlanGeometry(
    organizationId: string,
    facilityId: string,
    onRequestBody?: (body: unknown) => void,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/facilities/${facilityId}/plan-geometry(\\?.*)?$`,
      ),
      async (route) => {
        onRequestBody?.(route.request().postDataJSON());
        await route.fulfill({ status: 204 });
      },
    );
  }

  /**
   * Mocks a failing `POST …/facilities/{facilityId}/move` — the backend
   * refuses the re-parent (e.g. the target is a descendant, or a
   * permission/conflict error). `FacilityTreeStore.move` rolls the
   * optimistic re-parent back and dispatches `moveFailed` for the app-wide
   * feedback listener to toast.
   */
  public async mockFacilityMoveError(
    organizationId: string,
    facilityId: string,
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/facilities/${facilityId}/move`,
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, error.status ?? 409, {
          '@id': '/errors/facility-move-failed',
          '@type': 'Error',
          status: 409,
          type: 'about:blank',
          title: 'The facility could not be moved.',
          detail: 'The facility could not be moved.',
          ...error,
        });
      },
    );
  }

  /**
   * Mocks `PUT /api/organizations/{organizationId}/equipment/{equipmentId}/plan-position` —
   * the plan editor's equipment-pin write. `onRequestBody`, when given, is
   * invoked with the parsed request body so a spec can assert what
   * `EquipmentService.setPlanPosition` sent.
   */
  public async mockEquipmentPlanPosition(
    organizationId: string,
    equipmentId: string,
    onRequestBody?: (body: unknown) => void,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/equipment/${equipmentId}/plan-position(\\?.*)?$`,
      ),
      async (route) => {
        onRequestBody?.(route.request().postDataJSON());
        await route.fulfill({ status: 204 });
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
   * Mocks `GET /api/organizations/{organizationId}/facility-tree` — the
   * Compliance module's enriched facility hierarchy the assets explorer's
   * compliance axis loads on first activation (`ComplianceExplorerStore`).
   */
  public async mockComplianceFacilityTree(
    organizationId: string,
    tree: ComplianceFacilityTreeOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/facility-tree`,
      async (route) => {
        await fulfillJson(route, 200, tree);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities/{facilityId}/compliance` —
   * the single-facility compliance summary the assets explorer's compliance
   * axis loads when a tree node is selected.
   */
  public async mockFacilityCompliance(
    organizationId: string,
    facilityId: string,
    summary: ComplianceSummaryOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/facilities/${facilityId}/compliance`,
      async (route) => {
        await fulfillJson(route, 200, summary);
      },
    );
  }

  /**
   * Mocks `GET /api/facilities/{facilityId}/attachments` (list, filtered by
   * `kind`) and `POST /api/facilities/{facilityId}/attachments` (upload) in
   * one route, matching on method the way `mockFacilityPlanDelete` matches
   * `DELETE` — the Plans tab's list and its own upload response. `uploaded`,
   * when given, is returned for the upload; otherwise a fixed fixture is
   * used. `GET /api/facility-attachments/{id}/download` is also mocked with
   * a tiny inline PNG for every attachment id, so `FacilityPlansStore`'s
   * `loadImage` — the only source of `PlanViewer`'s `src` — actually
   * resolves instead of settling into the viewer's error state.
   */
  public async mockFacilityPlans(
    facilityId: string,
    plans: ReadonlyArray<FacilityAttachmentOutputFixture>,
    uploaded?: FacilityAttachmentOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    const uploadResponse =
      uploaded ?? facilityAttachmentOutput({ id: 'e2e-facility-plan-uploaded' });

    await this.page.route(
      new RegExp(`/api/facilities/${facilityId}/attachments(\\?.*)?$`),
      async (route) => {
        if (route.request().method() === 'POST') {
          await fulfillJson(route, 201, uploadResponse);

          return;
        }

        await fulfillJson(route, 200, hydraCollection(plans));
      },
    );

    await this.page.route(/\/api\/facility-attachments\/.+\/download$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG_BUFFER });
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/facilities/{facilityId}/plan-overlay` —
   * the selected plan's read-only zone/equipment overlay, fetched by
   * `FacilityPlansStore` alongside the plan image.
   */
  public async mockFacilityPlanOverlay(
    organizationId: string,
    facilityId: string,
    overlay: FacilityPlanOverlayOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/facilities/${facilityId}/plan-overlay(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, overlay);
      },
    );
  }

  /**
   * Mocks `POST /api/facility-attachments/{planId}/primary` — the Plans
   * tab's set-primary action.
   */
  public async mockFacilityPlanSetPrimary(
    planId: string,
    response: FacilityAttachmentOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/facility-attachments/${planId}/primary`, (route) =>
      fulfillJson(route, 200, response),
    );
  }

  /**
   * Mocks `DELETE /api/facility-attachments/{planId}` — the Plans tab's
   * per-row delete action.
   */
  public async mockFacilityPlanDelete(planId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/facility-attachments/${planId}`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        await route.continue();

        return;
      }

      await route.fulfill({ status: 204 });
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/inspections` — the
   * collection the inspections list page reads.
   */
  public async mockInspectionList(
    organizationId: string,
    inspections: ReadonlyArray<InspectionOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/inspections(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(inspections));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/inspections/{inspection.id}` —
   * the resource seeded by `inspectionResolver` for the inspection detail route.
   * Pass `holdUntil` to keep the response pending until the promise resolves,
   * simulating a slow connection deterministically (no sleeps): assert the
   * skeleton while held, release, then assert the content.
   */
  public async mockInspectionDetail(
    organizationId: string,
    inspection: InspectionOutputFixture,
    options: { holdUntil?: Promise<void> } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/inspections/${inspection.id}`,
      async (route) => {
        if (options.holdUntil) await options.holdUntil;
        await fulfillJson(route, 200, inspection);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/invitations/{token}/preview` — the public
   * endpoint the invitation-accept page loads for anyone holding the token,
   * signed in or not.
   */
  public async mockInvitationPreview(
    token: string,
    preview: OrganizationInvitationPreviewOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/invitations/${encodeURIComponent(token)}/preview`,
      async (route) => {
        await fulfillJson(route, 200, preview);
      },
    );
  }

  /**
   * Mocks a failing `GET /api/organizations/invitations/{token}/preview` —
   * an invalid, unknown or already-consumed token the backend cannot resolve.
   */
  public async mockInvitationPreviewError(
    token: string,
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/invitations/${encodeURIComponent(token)}/preview`,
      async (route) => {
        await fulfillJson(route, error.status ?? 404, {
          '@id': '/errors/invitation-not-found',
          '@type': 'Error',
          status: 404,
          type: 'about:blank',
          title: 'This invitation link is invalid, expired or has already been used.',
          ...error,
        });
      },
    );
  }

  /**
   * Mocks `POST /api/organizations/invitations/accept` — the authenticated
   * action that turns a pending invitation into a membership.
   */
  public async mockInvitationAccept(member: OrganizationMemberOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/organizations/invitations/accept`, async (route) => {
      await fulfillJson(route, 201, member);
    });
  }

  /**
   * Mocks a failing `POST /api/organizations/invitations/accept` — e.g. the
   * invitation was revoked or expired between the preview and the click.
   */
  public async mockInvitationAcceptError(error: Partial<ApiErrorFixture> = {}): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/organizations/invitations/accept`, async (route) => {
      await fulfillJson(route, error.status ?? 409, {
        '@id': '/errors/invitation-accept-failed',
        '@type': 'Error',
        status: 409,
        type: 'about:blank',
        title: 'This invitation can no longer be accepted.',
        detail: 'This invitation can no longer be accepted.',
        ...error,
      });
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/members` — the roster the
   * members page and the shell's member directory both read. Registered
   * after `mockAuthenticatedSession`, whose bootstrap installs the same
   * route returning an empty collection.
   */
  public async mockOrganizationMembers(
    organizationId: string,
    members: ReadonlyArray<OrganizationMemberOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/members(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(members));
      },
    );
  }

  /**
   * Mocks a successful `DELETE /api/organizations/{organizationId}/members/{memberId}`
   * — the request `OrganizationMembersStore.removeMember` sends from the
   * members page's remove-confirm dialog.
   */
  public async mockOrganizationMemberRemove(
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/members/${memberId}`,
      async (route) => {
        if (route.request().method() !== 'DELETE') {
          await route.fallback();
          return;
        }
        await route.fulfill({ status: 204 });
      },
    );
  }

  /**
   * Mocks a failing `DELETE /api/organizations/{organizationId}/members/{memberId}`
   * — the removal the backend refuses (e.g. the sole remaining owner). The
   * remove-confirm dialog stays open and shows this error inline instead of
   * closing.
   */
  public async mockOrganizationMemberRemoveError(
    organizationId: string,
    memberId: string,
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/members/${memberId}`,
      async (route) => {
        if (route.request().method() !== 'DELETE') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, error.status ?? 409, {
          '@id': '/errors/member-remove-failed',
          '@type': 'Error',
          status: 409,
          type: 'about:blank',
          title: 'This member could not be removed.',
          detail: 'This member could not be removed.',
          ...error,
        });
      },
    );
  }

  /**
   * Mocks a successful `DELETE /api/organizations/{organizationId}/members/me`
   * — the self-removal request `OrganizationSettingsStore.leave` sends from
   * both the settings danger tab and the sidebar organization switcher's
   * "Leave organization…" menu entry.
   */
  public async mockOrganizationMemberLeave(organizationId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/members/me`,
      async (route) => {
        if (route.request().method() !== 'DELETE') {
          await route.fallback();
          return;
        }
        await route.fulfill({ status: 204 });
      },
    );
  }

  /**
   * Mocks a failing `DELETE /api/organizations/{organizationId}/members/me`
   * — the backend's owner-cannot-leave / last-administrator 409 refusals,
   * surfaced inline on `OrganizationLeaveDialog` regardless of which call
   * site opened it.
   */
  public async mockOrganizationMemberLeaveError(
    organizationId: string,
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/members/me`,
      async (route) => {
        if (route.request().method() !== 'DELETE') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, error.status ?? 409, {
          '@id': '/errors/member-leave-failed',
          '@type': 'Error',
          status: 409,
          type: 'about:blank',
          title: 'You could not leave this organization.',
          detail: 'You could not leave this organization.',
          ...error,
        });
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/invitations` — the
   * pending-invitations grid on the members page.
   */
  public async mockOrganizationInvitations(
    organizationId: string,
    invitations: ReadonlyArray<OrganizationInvitationOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/invitations(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(invitations));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/roles` — the role catalog
   * read by the members page's role badges/assignment dialog and by the team
   * page's role grid.
   */
  public async mockOrganizationRoles(
    organizationId: string,
    roles: ReadonlyArray<OrganizationRoleOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/roles(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(roles));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/permissions` — the
   * permission catalog read by the team page's create dialog and permission
   * editor.
   */
  public async mockOrganizationPermissions(
    organizationId: string,
    permissions: ReadonlyArray<OrganizationPermissionOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/permissions(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(permissions));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/teams` — the named-group
   * catalog `OrganizationTeamsStore.load` reads for the members page's
   * `teams` tab. Defaults to an empty collection so navigating the route in
   * an otherwise-unrelated spec never hangs on the catch-all 404 net.
   */
  public async mockOrganizationTeams(
    organizationId: string,
    teams: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly description?: string;
    }> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/teams(\\?.*)?$`),
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, 200, hydraCollection(teams));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/quota` — the per-resource
   * usage `OrganizationQuotaStore` loads automatically for every organization
   * route, and the settings page's Usage tab renders directly.
   */
  public async mockOrganizationQuota(
    organizationId: string,
    quota: OrganizationQuotaOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/quota`,
      async (route) => {
        await fulfillJson(route, 200, quota);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/billing/subscription` —
   * the settings page's Subscription tab, loaded lazily on first activation.
   */
  public async mockOrganizationSubscription(
    organizationId: string,
    subscription: OrganizationSubscriptionOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/organizations/${organizationId}/billing/subscription`,
      async (route) => {
        await fulfillJson(route, 200, subscription);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/billing/invoices` — the
   * Subscription tab's invoice history.
   */
  public async mockOrganizationInvoices(
    organizationId: string,
    invoices: ReadonlyArray<InvoiceOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/billing/invoices(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(invoices));
      },
    );
  }

  /**
   * Mocks `GET /api/billing/pricing` — display pricing for the payable plan
   * catalog, joined by `OrganizationPlanSelector` on `planKey`.
   */
  public async mockBillingPricing(
    pricing: ReadonlyArray<PlanPricingOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/billing/pricing(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection(pricing));
    });
  }

  /**
   * Mocks `GET /api/plans` — the selectable plan catalog `OrganizationPlanSelector` loads on init.
   */
  public async mockPlans(plans: ReadonlyArray<PlanOutputFixture> = []): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/plans(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection(plans));
    });
  }

  /**
   * Mocks `GET /api/channels` — the channels page's list, and the dashboard
   * shell's channel-section widget. Registered after `mockAuthenticatedSession`,
   * whose bootstrap installs the same route returning an empty collection.
   */
  public async mockChannelList(channels: ReadonlyArray<ChannelOutputFixture> = []): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/channels(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection(channels));
    });
  }

  /**
   * Mocks `GET /api/channels/{channelId}` — the resource `ChannelsStore.loadOne`
   * reads for the routed channel, and `channelTitleResolver` for the breadcrumb.
   */
  public async mockChannelDetail(channel: ChannelOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/channels/${channel.id}`, async (route) => {
      await fulfillJson(route, 200, channel);
    });
  }

  /**
   * Mocks `GET /api/channels/{channelId}/participants` — the channel
   * conversation page's roster, read by `ChannelParticipantsStore`.
   */
  public async mockChannelParticipants(
    channelId: string,
    participants: ReadonlyArray<ChannelParticipantOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/channels/${channelId}/participants`,
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(participants));
      },
    );
  }

  /**
   * Mocks `POST /api/conversations` — the get-or-create call
   * `SubjectDiscussion` fires through `ConversationService.openSubjectThread`
   * once its `active` input turns true, memoized client-side by
   * `(organization, subjectType, subject)`. Matched on method only: the same
   * collection path also carries `GET /api/conversations` (list, not yet
   * exercised by this suite), which must keep falling through to the safety
   * net rather than being swallowed here.
   */
  public async mockSubjectConversationOpen(conversation: ConversationOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/conversations`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 201, conversation);
    });
  }

  /**
   * Mocks `PUT /api/conversations/{conversationId}/messages/{clientId}` —
   * `MessageThreadStore.send`'s actual write. `ConversationService`'s
   * `POST /api/conversations` only opens the thread; a message is posted
   * under an id the client mints itself (`crypto.randomUUID()`), so this
   * matches any id under the conversation and echoes the request's body back
   * on a `MessageOutput`, the way the real create-under-id endpoint would.
   */
  public async mockMessagePost(conversationId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/conversations/${conversationId}/messages/[^/?]+$`),
      async (route) => {
        if (route.request().method() !== 'PUT') {
          await route.fallback();
          return;
        }
        const clientId: string = route.request().url().split('/').pop() ?? 'e2e-message-sent';
        const posted = route.request().postDataJSON() as { body: string };

        await fulfillJson(
          route,
          200,
          messageOutput({
            id: clientId,
            '@id': `/api/messages/${clientId}`,
            conversation: `/api/conversations/${conversationId}`,
            body: posted.body,
          }),
        );
      },
    );
  }

  /**
   * Mocks `GET /api/conversations/{channelId}/messages` — the channel's
   * thread, read by `MessageThreadStore.load`. A channel id is its
   * conversation id on this API.
   */
  public async mockChannelMessages(
    channelId: string,
    messages: ReadonlyArray<MessageOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/conversations/${channelId}/messages(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(messages));
      },
    );
  }

  /**
   * Mocks `PATCH /api/conversations/{channelId}/read` — the read-marker write
   * `MessageThreadStore.markRead` fires on open and once the thread catches
   * up, so this must be mocked even though a failure there is caught silently.
   */
  public async mockConversationMarkRead(channelId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/conversations/${channelId}/read`, async (route) => {
      await fulfillJson(route, 200, { conversationId: channelId });
    });
  }

  /**
   * Mocks `GET /api/conversations/{channelId}/subscription` — the Mercure
   * subscriber token `MessageThreadStore.connect` mints on open. A failure
   * here is caught silently (realtime is an enhancement), but still worth
   * mocking to keep the network log clean.
   */
  public async mockChannelSubscription(channelId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/conversations/${channelId}/subscription`,
      async (route) => {
        await fulfillJson(route, 200, {
          '@id': `/api/conversations/${channelId}/subscription`,
          '@type': 'Conversation',
          topic: `/e2e/conversations/${channelId}`,
          token: 'e2e-mercure-token',
        });
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/dashboard` — the aggregate
   * payload `DashboardStore` reads for the statistics page's KPI row,
   * comparison deltas, and non-conformity severity breakdown.
   */
  public async mockOrganizationDashboard(
    organizationId: string,
    dashboard: OrganizationDashboardOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/dashboard(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, dashboard);
      },
    );
  }

  /**
   * Mocks a failing `GET /api/organizations/{organizationId}/dashboard` —
   * the statistics page's own "not available with your permissions" card
   * (`status: 403`) or its generic retryable error state for any other status.
   */
  public async mockOrganizationDashboardError(
    organizationId: string,
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/dashboard(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, error.status ?? 403, {
          '@id': '/errors/dashboard-forbidden',
          '@type': 'Error',
          status: 403,
          type: 'about:blank',
          title: 'You do not have permission to view this organization’s statistics.',
          ...error,
        });
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/dashboard/trends/inspections`
   * — one of the three parallel requests `OverviewTrendStore` fires for the
   * statistics page's Inspections chart.
   */
  public async mockDashboardInspectionsTrend(
    organizationId: string,
    trend: OrganizationDashboardTrendOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/dashboard/trends/inspections(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, trend);
      },
    );
  }

  /**
   * Mocks a failing `GET /api/organizations/{organizationId}/dashboard/trends/inspections`.
   * `OverviewTrendStore.load` fetches inspections, opened and resolved
   * non-conformities via `forkJoin`, so this alone fails the whole card and
   * renders both the Inspections and the Non-conformities charts as
   * permission-degraded — the rest of the statistics page stays intact.
   */
  public async mockDashboardInspectionsTrendError(
    organizationId: string,
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/dashboard/trends/inspections(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, error.status ?? 403, {
          '@id': '/errors/dashboard-trend-forbidden',
          '@type': 'Error',
          status: 403,
          type: 'about:blank',
          title: 'You do not have permission to view this trend.',
          ...error,
        });
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/dashboard/trends/non-conformities-opened`
   * — the second of `OverviewTrendStore`'s three parallel requests.
   */
  public async mockDashboardNonConformitiesOpenedTrend(
    organizationId: string,
    trend: OrganizationDashboardTrendOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/dashboard/trends/non-conformities-opened(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, trend);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/dashboard/trends/non-conformities-resolved`
   * — the third of `OverviewTrendStore`'s three parallel requests.
   */
  public async mockDashboardNonConformitiesResolvedTrend(
    organizationId: string,
    trend: OrganizationDashboardTrendOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/dashboard/trends/non-conformities-resolved(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, trend);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/dashboard/trends/equipment-created`
   * — one of `AssetGrowthTrendStore`'s two parallel requests, backing the
   * statistics page's Equipment added chart.
   */
  public async mockDashboardEquipmentCreatedTrend(
    organizationId: string,
    trend: OrganizationDashboardTrendOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/dashboard/trends/equipment-created(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, trend);
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/dashboard/trends/facilities-created`
   * — the other of `AssetGrowthTrendStore`'s two parallel requests, backing
   * the statistics page's Facilities added chart.
   */
  public async mockDashboardFacilitiesCreatedTrend(
    organizationId: string,
    trend: OrganizationDashboardTrendOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/dashboard/trends/facilities-created(\\?.*)?$`,
      ),
      async (route) => {
        await fulfillJson(route, 200, trend);
      },
    );
  }

  /**
   * Mocks `GET /api/interventions` for the parallel burst
   * `OrganizationTodayStore.load` fires for the Today page's four work
   * queues (`overdue` alone sends two requests, one per workable status —
   * `buildInterventionQueueRequests`), multiplexed on the `status` /
   * `dueAtBefore` / `dueAtAfter` query params each request carries. A request
   * outside every recognized bucket — notably the app-boot
   * `InterventionPrefetchService` warm-cache call — gets an empty collection
   * rather than falling through to the safety net.
   */
  public async mockInterventionQueues(
    queues: {
      overdue?: ReadonlyArray<InterventionOutputFixture>;
      changesRequested?: ReadonlyArray<InterventionOutputFixture>;
      awaitingReview?: ReadonlyArray<InterventionOutputFixture>;
      upcoming?: ReadonlyArray<InterventionOutputFixture>;
    } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    const overdue: ReadonlyArray<InterventionOutputFixture> = queues.overdue ?? [];
    const changesRequested: ReadonlyArray<InterventionOutputFixture> =
      queues.changesRequested ?? [];
    const awaitingReview: ReadonlyArray<InterventionOutputFixture> = queues.awaitingReview ?? [];
    const upcoming: ReadonlyArray<InterventionOutputFixture> = queues.upcoming ?? [];

    await this.page.route(new RegExp('/api/interventions(\\?.*)?$'), async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      const dueAtBefore = url.searchParams.get('dueAtBefore');
      const dueAtAfter = url.searchParams.get('dueAtAfter');

      if (status === 'submitted') {
        await fulfillJson(route, 200, hydraCollection(awaitingReview));
        return;
      }
      if (status === 'changes_requested') {
        await fulfillJson(route, 200, hydraCollection(changesRequested));
        return;
      }
      if (status === 'planned' && dueAtAfter) {
        await fulfillJson(route, 200, hydraCollection(upcoming));
        return;
      }
      if ((status === 'planned' || status === 'in_progress') && dueAtBefore) {
        await fulfillJson(
          route,
          200,
          hydraCollection(overdue.filter((intervention) => intervention.status === status)),
        );
        return;
      }

      await fulfillJson(route, 200, hydraCollection([]));
    });
  }

  /**
   * Mocks a failing `GET /api/interventions` — the Today page's work-queue
   * error state (`OrganizationTodayStore.hasError`), independent of the
   * dashboard KPI/alerts query.
   */
  public async mockInterventionQueuesError(error: Partial<ApiErrorFixture> = {}): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/interventions(\\?.*)?$'), async (route) => {
      await fulfillJson(route, error.status ?? 500, {
        '@id': '/errors/intervention-queues-failed',
        '@type': 'Error',
        status: 500,
        type: 'about:blank',
        title: 'Could not load the intervention queues.',
        ...error,
      });
    });
  }

  /**
   * Mocks `GET /api/interventions` for the interventions list page
   * (`InterventionStore.load`), echoing the `status` / `member` / `label` /
   * `number` query params `InterventionsPage`'s filter bar and `mine` toggle
   * send, so a filtered/shared URL renders only the matching fixtures rather
   * than every one handed in. `label` matches against each fixture's own
   * `labels` array — tests populate it with the label IRI(s) the fixture
   * should be found under.
   */
  public async mockInterventionList(
    organizationId: string,
    interventions: ReadonlyArray<InterventionOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/interventions(\\?.*)?$'), async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      const member = url.searchParams.get('member');
      const label = url.searchParams.get('label');
      const number = url.searchParams.get('number');

      const filtered = interventions.filter((intervention) => {
        if (status && intervention.status !== status) return false;
        if (
          member &&
          intervention.responsible !== member &&
          !intervention.participants.includes(member)
        ) {
          return false;
        }
        if (label && !(intervention.labels as readonly string[]).includes(label)) return false;
        if (number && String(intervention.number) !== number) return false;

        return true;
      });

      await fulfillJson(route, 200, hydraCollection(filtered));
    });
  }

  /**
   * Mocks a successful `POST /api/interventions` — the create sheet's
   * submit. Method-checked so it composes with `mockInterventionList` /
   * `mockInterventionQueues` on the same path, falling back to whichever of
   * those is registered for `GET`.
   */
  public async mockInterventionCreate(created: InterventionOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/interventions(\\?.*)?$'), async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 201, created);
    });
  }

  /**
   * Mocks `GET /api/interventions/statistics` — the whole-organization
   * snapshot `InterventionStatisticsStore` reads once per organization to back
   * the interventions list KPI strip.
   *
   * Registered separately from {@link mockInterventionList} because the two
   * are different endpoints: the list route matches `/api/interventions`
   * followed by an optional query string and nothing else, so it never sees
   * `/api/interventions/statistics`. Without this mock the safety net answers
   * the request with a 404 and every tile of the strip renders zero — which is
   * what the existing interventions specs have been asserting against.
   */
  public async mockInterventionStatistics(
    statistics: InterventionStatisticsOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/interventions/statistics(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, statistics);
    });
  }

  /**
   * Mocks `GET /api/intervention-labels` — the organization's label catalog,
   * read by `InterventionPlanningOptionsStore` for the list page's label
   * filter select and the create/detail forms' label editor.
   */
  public async mockInterventionLabels(
    organizationId: string,
    labels: ReadonlyArray<InterventionLabelOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/intervention-labels(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection(labels));
    });
  }

  /**
   * Mocks `GET /api/intervention-templates` — the organization's template
   * catalog, feeding the create sheet's template picker and the recurrences
   * sheet's own template select and table name resolver.
   */
  public async mockInterventionTemplates(
    organizationId: string,
    templates: ReadonlyArray<InterventionTemplateOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/intervention-templates(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection(templates));
    });
  }

  /**
   * Mocks `GET /api/intervention-recurrences` — the organization's recurring
   * schedule catalog, backing the "Recurrences" sheet's table.
   */
  public async mockInterventionRecurrenceList(
    organizationId: string,
    recurrences: ReadonlyArray<InterventionRecurrenceOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/intervention-recurrences(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection(recurrences));
    });
  }

  /**
   * Mocks a failing `GET /api/intervention-recurrences` — the "Recurrences"
   * sheet's own list fetch error state.
   */
  public async mockInterventionRecurrenceListError(
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/intervention-recurrences(\\?.*)?$'), async (route) => {
      await fulfillJson(route, error.status ?? 500, {
        '@id': '/errors/intervention-recurrences-failed',
        '@type': 'Error',
        status: 500,
        type: 'about:blank',
        title: 'Could not load the recurrences.',
        ...error,
      });
    });
  }

  /**
   * Mocks a successful `DELETE /api/intervention-recurrences/{recurrenceId}`
   * — the request the recurrences tab's delete-confirm dialog sends.
   */
  public async mockInterventionRecurrenceDelete(recurrenceId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/intervention-recurrences/${recurrenceId}`,
      async (route) => {
        if (route.request().method() !== 'DELETE') {
          await route.fallback();
          return;
        }
        await route.fulfill({ status: 204 });
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/checklists` — the
   * checklist template library `ChecklistsPage` reads. Defaults to an empty
   * collection so navigating the route in an otherwise-unrelated spec never
   * hangs on the catch-all 404 net.
   */
  public async mockChecklistList(
    organizationId: string,
    checklists: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly status: 'active' | 'archived';
      readonly items: ReadonlyArray<unknown>;
      readonly updatedAt: string;
    }> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/checklists(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(checklists));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/calendar/feed` — the
   * unified feed `CalendarFeedStore.load` reads for `calendar-page`'s
   * displayed window. Defaults to an empty window so navigating the route in
   * an otherwise-unrelated spec never hangs on the catch-all 404 net.
   */
  public async mockCalendarFeed(
    organizationId: string,
    items: ReadonlyArray<unknown> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/calendar/feed(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, {
          '@id': `/api/organizations/${organizationId}/calendar/feed`,
          '@type': 'CalendarFeed',
          from: new Date().toISOString(),
          to: new Date().toISOString(),
          items,
        });
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/equipment-types` — one of
   * the parallel reads `InterventionPlanningOptionsStore.loadWorkspaceOptions`
   * fires for the detail page's forms.
   */
  public async mockInterventionEquipmentTypes(
    organizationId: string,
    types: ReadonlyArray<{ readonly value: string; readonly label: string }> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/equipment-types(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(types));
      },
    );
  }

  /**
   * Mocks a successful `PATCH /api/interventions/{interventionId}` — the
   * request `InterventionStore.transition` (single or bulk) sends. Pass the
   * fixture as the server would return it post-transition (new `status`,
   * bumped `revision`, refreshed `allowedTransitions`).
   */
  public async mockInterventionTransition(
    interventionId: string,
    updated: InterventionOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/interventions/${interventionId}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 200, updated);
    });
  }

  /**
   * Mocks a failing `PATCH /api/interventions/{interventionId}` — a
   * transition the backend refuses (stale revision, invalid move, forbidden,
   * or a plain conflict). `InterventionStore.transition` rolls the row back
   * to its pre-transition snapshot and dispatches `transitionFailed` for the
   * app-wide feedback listener to toast.
   */
  public async mockInterventionTransitionError(
    interventionId: string,
    error: Partial<ApiErrorFixture> = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/interventions/${interventionId}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, error.status ?? 409, {
        '@id': '/errors/intervention-transition-failed',
        '@type': 'Error',
        status: 409,
        type: 'about:blank',
        title: 'The intervention status could not be updated.',
        detail: 'The intervention status could not be updated.',
        ...error,
      });
    });
  }

  /**
   * Mocks `GET /api/interventions/{interventionId}` — the resource the
   * detail page's workspace store (and `interventionTitleResolver`'s
   * fire-and-forget seed) both read.
   */
  public async mockInterventionDetail(intervention: InterventionOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/interventions/${intervention.id}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 200, intervention);
    });
  }

  /**
   * Mocks `GET /api/intervention-work-items` filtered to one intervention —
   * `InterventionWorkspaceStore.load`'s work-item read, and the field-work
   * table it feeds.
   */
  public async mockInterventionWorkItems(
    interventionId: string,
    workItems: ReadonlyArray<InterventionWorkItemOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/intervention-work-items(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection(workItems));
    });
  }

  /**
   * Mocks a successful `PATCH /api/intervention-work-items/{workItemId}` —
   * the request `InterventionWorkspaceStore.setWorkItemStatus` sends when an
   * operator toggles a row's completion.
   */
  public async mockInterventionWorkItemUpdate(
    workItemId: string,
    updated: InterventionWorkItemOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/intervention-work-items/${workItemId}`,
      async (route) => {
        if (route.request().method() !== 'PATCH') {
          await route.fallback();
          return;
        }
        await fulfillJson(route, 200, updated);
      },
    );
  }

  /**
   * Mocks `GET /api/intervention-changes` filtered to one intervention —
   * `InterventionWorkspaceStore.load`'s proposed-changes read.
   */
  public async mockInterventionChanges(
    interventionId: string,
    changes: ReadonlyArray<unknown> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/intervention-changes(\\?.*)?$'), async (route) => {
      await fulfillJson(route, 200, hydraCollection(changes));
    });
  }

  /**
   * Mocks `GET /api/interventions/{interventionId}/issues` —
   * `InterventionWorkspaceStore.load`'s publication-readiness read, which
   * feeds `InterventionIssuesChecklist`. Re-registering this after the
   * blocker's own fixture (Playwright matches routes last-registered-first)
   * lets a spec serve a cleared list on a subsequent load without touching
   * the first registration.
   */
  public async mockInterventionIssues(
    interventionId: string,
    issues: ReadonlyArray<InterventionIssueOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/interventions/${interventionId}/issues`,
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(issues));
      },
    );
  }

  /**
   * Mocks `GET /api/interventions/{interventionId}/activities` — the detail
   * page's activity timeline, fetched alongside the workspace on load.
   */
  public async mockInterventionActivities(
    interventionId: string,
    activities: ReadonlyArray<unknown> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/interventions/${interventionId}/activities(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(activities));
      },
    );
  }

  /**
   * Mocks `GET /api/interventions/{interventionId}/attachments` — fetched
   * alongside the workspace on load.
   */
  public async mockInterventionAttachments(
    interventionId: string,
    attachments: ReadonlyArray<unknown> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `${API_BASE_URL}/api/interventions/${interventionId}/attachments`,
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(attachments));
      },
    );
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/approval-requests` — the
   * four-eyes inbox `ApprovalsPage` reads.
   */
  public async mockApprovalRequestList(
    organizationId: string,
    requests: ReadonlyArray<ApprovalRequestOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/approval-requests(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(requests));
      },
    );
  }

  /**
   * Mocks `GET /api/approvals/action-types` — the canonical, non-organization
   * -scoped regulated action-type catalog behind the inbox's "Action type"
   * filter chip.
   */
  public async mockApprovalActionTypes(
    actionTypes: ReadonlyArray<ApprovalActionTypeOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/approvals/action-types`, async (route) => {
      await fulfillJson(route, 200, hydraCollection(actionTypes));
    });
  }

  /**
   * Mocks `GET /api/organizations/{organizationId}/audit-events` — the
   * journal `AuditPage` reads.
   */
  public async mockAuditEventList(
    organizationId: string,
    events: ReadonlyArray<AuditEventOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/audit-events(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, hydraCollection(events));
      },
    );
  }

  /**
   * Mocks `GET /api/imports` — the canonical, non-organization-scoped import
   * job collection `ImportsPage` reads, `organization` always present as a
   * required query parameter.
   */
  public async mockImportJobList(jobs: ReadonlyArray<ImportJobOutputFixture> = []): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp(`/api/imports(\\?.*)?$`), async (route) => {
      await fulfillJson(route, 200, hydraCollection(jobs));
    });
  }

  /**
   * Mocks `GET /api/maintenance/schedules` — the canonical, non-organization
   * -scoped schedules collection `MaintenanceSchedulesPage` reads,
   * `organization` always present as a required query parameter.
   */
  public async mockMaintenanceScheduleList(
    schedules: ReadonlyArray<MaintenanceScheduleOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp(`/api/maintenance/schedules(\\?.*)?$`), async (route) => {
      await fulfillJson(route, 200, hydraCollection(schedules));
    });
  }
}
