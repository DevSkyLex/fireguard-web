import type { Page, Route } from '@playwright/test';
import {
  currentOrganizationMemberProfileOutput,
  hydraCollection,
  loginOutput,
  onboardingOutput,
  organizationOutput,
  mercureSubscriptionOutput,
  userProfileOutput,
  type CurrentOrganizationMemberProfileOutputFixture,
  type LoginOutputFixture,
  type OnboardingOutputFixture,
  type OrganizationOutputFixture,
  type UserProfileOutputFixture,
} from '../fixtures/api-fixtures';
import type { EquipmentOutputFixture } from '../fixtures/equipment-fixtures';
import type { FacilityOutputFixture } from '../fixtures/facility-fixtures';
import type { InspectionOutputFixture } from '../fixtures/inspection-fixtures';

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
   * Mocks `GET /api/organizations/{organizationId}/me` — the effective
   * roles/permissions payload consumed by `organizationAccessGuard`,
   * `organizationLandingGuard`, and `organizationPermissionGuard`. Defaults to
   * every `ORGANIZATION_PERMISSION` value granted; pass `permissions` to test
   * a permission-denied redirect (e.g. hiding "New equipment"/"New facility").
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
   * Mocks `GET /api/organizations/{organizationId}/facilities/{facility.id}` —
   * the resource seeded by `facilityResolver` for the facility detail route.
   * Pass `holdUntil` to keep the response pending until the promise resolves,
   * simulating a slow connection deterministically (no sleeps): assert the
   * skeleton while held, release, then assert the content.
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
}
