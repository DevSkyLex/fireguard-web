import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import type { OrganizationAccessPolicyOutput } from '../../../src/app/features/organization/models/access/organization-access-policy-output.interface';
import type { OrganizationJoinOptionsOutput } from '../../../src/app/features/organization/models/access/organization-join-options-output.interface';
import type { OrganizationJoinRequestOutput } from '../../../src/app/features/organization/models/access/organization-join-request-output.interface';
import {
  currentOrganizationMemberProfileOutput,
  E2E_ORGANIZATION_ID,
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
  type OnboardingSetupOperationFixture,
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
import {
  organizationQuotaOutput,
  type InvoiceOutputFixture,
  type OrganizationQuotaOutputFixture,
  type OrganizationSubscriptionOutputFixture,
  type PlanOutputFixture,
  type PlanPricingOutputFixture,
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
import {
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  organizationDashboardOutput,
  type OrganizationDashboardOutputFixture,
  type OrganizationDashboardTrendOutputFixture,
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
import {
  acceptedOrganizationMemberOutput,
  type OrganizationInvitationPreviewOutputFixture,
  type OrganizationMemberOutputFixture,
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
  /** Provides deterministic address suggestions without contacting a geocoding provider. */
  public async mockFacilityAddressSuggestions(organizationId: string): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      `**/api/organizations/${organizationId}/facilities/address-suggestions?*`,
      async (route) => {
        await fulfillJson(route, 200, {
          '@context': '/api/contexts/AddressSuggestion',
          '@type': 'hydra:Collection',
          member: [
            {
              displayName: '12 Quai des Docks, 76600 Le Havre, France',
              street: '12 Quai des Docks',
              city: 'Le Havre',
              region: 'Normandie',
              country: 'France',
              countryCode: 'FR',
              postalCode: '76600',
              latitude: 49.49,
              longitude: 0.12,
            },
          ],
          totalItems: 1,
        });
      },
    );
  }

  /** Confirms explicit immediate admission without trusting browser-supplied role data. */
  public async mockWorkspaceImmediateAdmission(
    organizationId: string,
    onAction: () => void,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/join(\\?.*)?$`),
      async (route) => {
        onAction();
        await fulfillJson(route, 200, { organizationId });
      },
    );
  }

  /** Runs a user-bound OTP exchange while leaving discovery hidden until confirmation. */
  public async mockWorkspaceEmailOwnership(onConfirm: (body: unknown) => void): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/auth\/email-ownership\/start(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, { challengeToken: 'a'.repeat(64), canResendIn: 60 });
    });
    await this.page.route(/\/api\/auth\/email-ownership\/confirm(\?.*)?$/, async (route) => {
      onConfirm(route.request().postDataJSON());
      await fulfillJson(route, 200, { verified: true });
    });
  }

  /** Supplies organization access settings and their exact DNS verification instructions. */
  public async mockOrganizationAccessPolicy(
    organizationId: string,
    policy: OrganizationAccessPolicyOutput,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/access-policy(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, policy);
      },
    );
  }

  /** Supplies only manager-visible applicant identity and assignable review roles. */
  public async mockOrganizationJoinRequests(
    organizationId: string,
    requests: readonly OrganizationJoinRequestOutput[],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/join-requests(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, {
          ...hydraCollection(requests),
          assignableRoles: [{ id: 'member-role', label: 'Member' }],
        });
      },
    );
  }

  /** Completes a provider callback through the existing session/MFA response contract. */
  public async mockFederatedLoginComplete(
    provider: 'google' | 'microsoft',
    response: LoginOutputFixture,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/auth/federated/${provider}/complete(\\?.*)?$`),
      async (route) => {
        await fulfillJson(route, 200, response);
      },
    );
  }

  /** Supplies private workspace choices, including state changes after an explicit action. */
  public async mockWorkspaceOptions(
    response: () => OrganizationJoinOptionsOutput,
    status = 200,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/organizations\/join-options(\?.*)?$/, async (route) => {
      await fulfillJson(
        route,
        status,
        status === 200 ? response() : { message: 'Workspace discovery unavailable.' },
      );
    });
  }

  /** Creates or cancels a caller-owned membership request without contacting a live API. */
  public async mockWorkspaceRequestAction(
    path: 'request' | 'cancel',
    organizationId: string,
    response: OrganizationJoinRequestOutput,
    onAction: () => void,
  ): Promise<void> {
    await this.installSafetyNet();
    const endpoint =
      path === 'request'
        ? `/api/organizations/${organizationId}/join-requests`
        : `/api/organizations/join-requests/${response.id}/cancel`;
    await this.page.route(new RegExp(`${endpoint}(\\?.*)?$`), async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      onAction();
      await fulfillJson(route, 200, response);
    });
  }

  /** Accepts only the invitation identifier selected by the test user. */
  public async mockWorkspaceInvitationAcceptance(
    invitationId: string,
    organizationId: string,
    onAction: () => void,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp(`/api/organizations/invitations/${invitationId}/accept(\\?.*)?$`),
      async (route) => {
        onAction();
        await fulfillJson(route, 200, { organizationId });
      },
    );
  }

  /** Records explicit creation intent independently from reading available workspaces. */
  public async mockOnboardingStart(
    response: OnboardingOutputFixture,
    onAction: (body: unknown) => void,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/onboarding\/organization\/start(\?.*)?$/, async (route) => {
      onAction(route.request().postDataJSON());
      this.onboardingRecord = response;
      await fulfillJson(route, 200, response);
    });
  }

  /** Confirmed writes projected into subsequent collection reads, matching server behavior. */
  private readonly interventionUpdates = new Map<string, InterventionOutputFixture>();
  private readonly page: Page;
  private safetyNetInstalled = false;
  private onboardingRecord: OnboardingOutputFixture | null = null;

  /** Persists a prepared setup batch before any resource endpoint is called. */
  private async mockSetupPreparation(): Promise<void> {
    await this.page.route(
      /\/api\/onboarding\/organization\/setup-operations(\?.*)?$/,
      async (route) => {
        const input = route.request().postDataJSON() as {
          sessionId: string;
          stepKey: OnboardingSetupOperationFixture['stepKey'];
          items: readonly { itemKey: string; payload: Readonly<Record<string, unknown>> }[];
        };
        const record = this.onboardingRecord;
        if (!record || input.sessionId !== record.sessionId) {
          await fulfillJson(route, 409, { message: 'Setup session mismatch.' });
          return;
        }
        const retained = record.setupOperations.filter(
          (operation) => operation.stepKey !== input.stepKey || operation.status === 'completed',
        );
        const prepared: OnboardingSetupOperationFixture[] = input.items
          .filter((item) => !retained.some((operation) => operation.itemKey === item.itemKey))
          .map((item) =>
            Object.assign({}, item, {
              stepKey: input.stepKey,
              status: 'prepared' as const,
              resourceId: null,
            }),
          );
        this.onboardingRecord = { ...record, setupOperations: [...retained, ...prepared] };
        await fulfillJson(route, 200, this.onboardingRecord);
      },
    );
  }

  /** Keeps resource receipts in the same mocked server state used by subsequent GETs. */
  public recordSetupCreation(route: Route, resourceId: string, organizationId?: string): void {
    const input = route.request().postDataJSON() as {
      onboardingSessionId?: string;
      onboardingItemKey?: string;
    };
    if (
      !this.onboardingRecord ||
      input.onboardingSessionId !== this.onboardingRecord.sessionId ||
      !input.onboardingItemKey
    )
      return;
    this.onboardingRecord = {
      ...this.onboardingRecord,
      ...(organizationId ? { targetOrganizationId: organizationId } : {}),
      setupOperations: this.onboardingRecord.setupOperations.map((operation) =>
        operation.itemKey === input.onboardingItemKey
          ? Object.assign({}, operation, { status: 'completed' as const, resourceId })
          : operation,
      ),
    };
  }

  /** Advances only the flow state, retaining durable receipts from prior resource writes. */
  private advanceOnboarding(record: OnboardingOutputFixture): OnboardingOutputFixture {
    this.onboardingRecord = {
      ...record,
      setupOperations: this.onboardingRecord?.setupOperations ?? record.setupOperations,
    };
    return this.onboardingRecord;
  }

  public constructor(page: Page) {
    this.page = page;
  }

  /** Successful mutations remain visible to later mocked collection GETs. */
  private readonly updatedInterventionRows = new Map<string, unknown>();

  /** Applies scalar/repeated facets, text, assignee ordering and pagination like the API. */
  private interventionCollection(rows: readonly unknown[], url: URL): unknown {
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
    const statuses = [...url.searchParams.getAll('status'), ...url.searchParams.getAll('status[]')];
    const type = url.searchParams.get('type');
    const result = url.searchParams.get('result');
    const matching = rows
      .map((row) => {
        const record = row as { id: string };
        return this.updatedInterventionRows.get(record.id) ?? row;
      })
      .filter((row) => {
        const record = row as Record<string, unknown>;
        return (
          (!statuses.length || statuses.includes(String(record['status']))) &&
          (!type || record['type'] === type) &&
          (!result || record['result'] === result) &&
          (!search ||
            Object.values(record)
              .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
              .join(' ')
              .toLowerCase()
              .includes(search))
        );
      });
    if (url.pathname.endsWith('/intervention-work-items')) {
      const assignee = url.searchParams.get('prioritizeAssignee');
      matching.sort((left, right) => {
        const a = left as InterventionWorkItemOutputFixture;
        const b = right as InterventionWorkItemOutputFixture;
        return (
          (assignee ? Number(b.assignee === assignee) - Number(a.assignee === assignee) : 0) ||
          Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        );
      });
    }
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const size =
      url.searchParams.get('pagination') === 'false'
        ? Math.max(1, matching.length)
        : Math.max(1, Number(url.searchParams.get('itemsPerPage') ?? 30));
    const next = new URL(url);
    next.searchParams.set('page', String(page + 1));
    return {
      ...hydraCollection(matching.slice((page - 1) * size, page * size), {
        totalItems: matching.length,
      }),
      ...(page * size < matching.length ? { view: { next: next.pathname + next.search } } : {}),
    };
  }

  /** Resolves a change PATCH and updates subsequent server-query results. */
  public async mockInterventionChangeUpdate(
    changeId: string,
    updated: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/intervention-changes/${changeId}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      this.updatedInterventionRows.set(changeId, updated);
      await fulfillJson(route, 200, updated);
    });
  }

  /**
   * Registers a catch-all 404 and a Playwright failure for any `/api/*` request
   * not covered by a specific mock, including an accidentally changed backend origin.
   * A UI that swallows the error still fails the hermetic test.
   * Playwright matches routes last-registered-first, so specific mocks
   * registered afterwards always win over this fallback.
   */
  private async installSafetyNet(): Promise<void> {
    if (this.safetyNetInstalled) return;
    this.safetyNetInstalled = true;

    await this.page.route(/\/api(?:\/|\?|$)/, async (route) => {
      const message = `No E2E mock registered for ${route.request().method()} ${route.request().url()}`;
      await fulfillJson(route, 404, {
        '@id': '/errors/not-mocked',
        '@type': 'Error',
        status: 404,
        type: 'about:blank',
        title: message,
      });
      expect.soft(false, `Hermetic safety net: ${message}`).toBe(true);
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
    // Provider discovery is part of auth-page initialization, even in password-only scenarios.
    await this.page.route(`${API_BASE_URL}/api/auth/federated/providers`, async (route) => {
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(`${API_BASE_URL}/api/auth/refresh`, async (route) => {
      await fulfillJson(route, 401, { message: 'Unauthorized' });
    });
  }

  /** Mocks the logout outcome while accepting only the production POST contract. */
  public async mockLogout(options: { readonly status?: number } = {}): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(`${API_BASE_URL}/api/auth/federated/providers`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(`${API_BASE_URL}/api/auth/logout`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      const status: number = options.status ?? 200;
      if (status >= 400) {
        await fulfillJson(route, status, {
          '@type': 'hydra:Error',
          title: 'Logout failed',
          detail: 'The remote session could not be revoked.',
        });
        return;
      }

      await fulfillJson(route, 200, {
        '@id': '/api/auth/logout',
        '@type': 'Logout',
        message: 'Logged out',
      });
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
    this.onboardingRecord = onboarding;
    await this.mockSetupPreparation();
    const organizations: ReadonlyArray<OrganizationOutputFixture> = options?.organizations ?? [
      organizationOutput(),
    ];

    await this.page.route(`${API_BASE_URL}/api/me`, async (route) => {
      await fulfillJson(route, 200, profile);
    });
    await this.page.route(`${API_BASE_URL}/api/notifications/subscription`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, mercureSubscriptionOutput());
    });
    const notifications: ReadonlyArray<NotificationOutputFixture> = options?.notifications ?? [];
    await this.page.route(/\/api\/notifications(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
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
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, { unreadCount: options?.unreadCount ?? 0 });
    });
    // The collaboration sidebar loads on every workspace-shell route; without
    // these, the channel section renders its error state and the DM store
    // surfaces a raw-HTTP error toast that races into screenshots.
    await this.page.route(/\/api\/channels(\?.*)?$/, async (route) => {
      const request = route.request();
      if (
        request.method() !== 'GET' ||
        !organizations.some(
          (organization) =>
            new URL(request.url()).searchParams.get('organization') === organization.id,
        )
      )
        return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/direct-conversations(\?.*)?$/, async (route) => {
      const request = route.request();
      if (
        request.method() !== 'GET' ||
        !organizations.some(
          (organization) =>
            new URL(request.url()).searchParams.get('organization') === organization['@id'],
        )
      )
        return route.fallback();
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
      if (route.request().method() !== 'GET') return route.fallback();
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
      await fulfillJson(route, 200, this.onboardingRecord ?? onboarding);
    });
    await this.page.route(/\/api\/organizations(\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, hydraCollection(organizations));
    });

    // Organization landing pages can be reached as a side effect of an
    // onboarding action or a deep-link test. Keep the authenticated shell
    // deterministic even when the spec is not asserting dashboard data.
    // Feature-specific dashboard mocks registered after this session setup
    // still win because Playwright evaluates routes last-registered-first.
    await this.page.route(/\/api\/organizations\/[^/]+\/dashboard(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, organizationDashboardOutput());
    });
    await this.page.route(
      /\/api\/organizations\/[^/]+\/dashboard\/trends\/(inspections|non-conformities-opened|non-conformities-resolved|equipment-created|facilities-created)(\?.*)?$/,
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const metric = new URL(route.request().url()).pathname.split('/').at(-1);
        const trend: OrganizationDashboardTrendOutputFixture =
          metric === 'inspections'
            ? inspectionsTrendOutput()
            : metric === 'non-conformities-opened'
              ? nonConformitiesOpenedTrendOutput()
              : metric === 'non-conformities-resolved'
                ? nonConformitiesResolvedTrendOutput()
                : metric === 'equipment-created'
                  ? equipmentCreatedTrendOutput()
                  : facilitiesCreatedTrendOutput();
        await fulfillJson(route, 200, trend);
      },
    );
    await this.page.route(
      /\/api\/organizations\/[^/]+\/facilities\/[^/]+\/(equipment|inspections)(\?.*)?$/,
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await fulfillJson(route, 200, hydraCollection([]));
      },
    );
    await this.page.route(
      /\/api\/organizations\/[^/]+\/compliance\/register-snapshots(\?.*)?$/,
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await fulfillJson(route, 200, hydraCollection([]));
      },
    );
    // These secondary organization reads are started by feature pages before
    // their scenario-specific mocks are registered. Specific routes added
    // after `mockAuthenticatedSession` still win (last-registered-first).
    await this.page.route(/\/api\/organizations\/[^/]+\/facility-tree(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/organizations\/[^/]+\/equipment\/kpis(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, equipmentKpiOutput());
    });
    await this.page.route(/\/api\/organizations\/[^/]+\/checklists(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/organizations\/[^/]+\/invitations(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/organizations\/[^/]+\/roles(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/organizations\/[^/]+\/quota(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const organizationId: string = new URL(route.request().url()).pathname.split('/')[3] ?? '';
      await fulfillJson(
        route,
        200,
        organizationQuotaOutput({
          '@id': `/api/organizations/${organizationId}/quota`,
          organizationId,
        }),
      );
    });
    await this.page.route(/\/api\/organizations\/[^/]+\/facilities(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    // Workspace-shell prefetches and route resolvers can read these shared
    // catalogs before a scenario registers its own fixture. Specific mocks
    // registered after the authenticated session still win (last-registered-first).
    await this.page.route(/\/api\/organizations\/[^/]+\/equipment(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/organizations\/[^/]+\/members\/[^/]+(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      const segments = url.pathname.split('/');
      const organizationId = segments.at(-3) ?? E2E_ORGANIZATION_ID;
      const memberId = segments.at(-1) ?? 'e2e-member-1';
      await fulfillJson(
        route,
        200,
        acceptedOrganizationMemberOutput({
          '@id': `/api/organizations/${organizationId}/members/${memberId}`,
          id: memberId,
          organizationId,
        }),
      );
    });
    await this.page.route(/\/api\/organizations\/legal-types(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(
        route,
        200,
        hydraCollection([
          optionOutput({ value: 'sas', label: 'SAS' }),
          optionOutput({ value: 'sarl', label: 'SARL' }),
        ]),
      );
    });
    await this.page.route(/\/api\/intervention-work-items(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/intervention-changes(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/interventions\/[^/]+\/issues(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/intervention-templates(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
    });
    await this.page.route(/\/api\/intervention-labels(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, hydraCollection([]));
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
    this.onboardingRecord = onboarding;
    await this.mockSetupPreparation();
    await this.page.route(`${API_BASE_URL}/api/onboarding/organization`, async (route) => {
      await fulfillJson(route, 200, this.onboardingRecord ?? onboarding);
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
        await fulfillJson(route, 200, this.advanceOnboarding(onboarding));
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
        await fulfillJson(route, 200, this.advanceOnboarding(onboarding));
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
      this.recordSetupCreation(route, organization.id, organization.id);
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
        this.recordSetupCreation(route, equipment.id);
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        this.recordSetupCreation(route, facility.id);
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
        if (route.request().method() !== 'GET') return route.fallback();
        if (options.holdUntil) await options.holdUntil;
        await fulfillJson(route, 200, facility);
      },
    );
    await this.page.route(new RegExp('/api/interventions(\\?.*)?$'), async (route) => {
      const query = new URL(route.request().url()).searchParams;
      if (
        route.request().method() !== 'GET' ||
        query.get('organization') !== `/api/organizations/${organizationId}` ||
        query.get('site') !== `/api/facilities/${facility.id}`
      )
        return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
        await fulfillJson(route, 200, hydraCollection(options.equipment ?? []));
      },
    );
    await this.page.route(
      new RegExp(
        `/api/organizations/${organizationId}/facilities/${facilityId}/inspections(\\?.*)?$`,
      ),
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
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
   * a tiny inline PNG only for the listed/uploaded attachment ids, so `FacilityPlansStore`'s
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
        if (route.request().method() !== 'GET') return route.fallback();
        await fulfillJson(route, 200, hydraCollection(plans));
      },
    );

    const downloadPaths = new Set(
      [...plans, uploadResponse].map((plan) => `/api/facility-attachments/${plan.id}/download`),
    );
    await this.page.route(/\/api\/facility-attachments\/.+\/download$/, async (route) => {
      if (
        route.request().method() !== 'GET' ||
        !downloadPaths.has(new URL(route.request().url()).pathname)
      )
        return route.fallback();
      await route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG_BUFFER });
    });
    await this.page.route(
      /\/api\/organizations\/[^/]+\/facilities\/[^/]+\/plan-overlay(\?.*)?$/,
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const attachmentId: string =
          new URL(route.request().url()).searchParams.get('attachmentId') ??
          plans.find((plan) => plan.isPrimaryPlan)?.id ??
          plans[0]?.id ??
          uploadResponse.id;
        const attachment = [...plans, uploadResponse].find((plan) => plan.id === attachmentId);
        await fulfillJson(route, 200, {
          attachmentId,
          imageWidth: attachment?.imageWidth ?? 1200,
          imageHeight: attachment?.imageHeight ?? 800,
          zones: [],
          equipment: [],
        });
      },
    );
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
        if (route.request().method() !== 'GET') return route.fallback();
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
   * Opt-in role filtering returns only existing fixture rows matching the requested roleId.
   */
  public async mockOrganizationMembers(
    organizationId: string,
    members: ReadonlyArray<OrganizationMemberOutputFixture> = [],
    options: { filterByRole?: boolean } = {},
  ): Promise<void> {
    await this.installSafetyNet();
    await Promise.all(
      members.map((member) =>
        this.page.route(
          new RegExp(`/api/organizations/${organizationId}/members/${member.id}(\\?.*)?$`),
          async (route) => {
            if (route.request().method() !== 'GET') return route.fallback();
            await fulfillJson(route, 200, member);
          },
        ),
      ),
    );
    await this.page.route(
      new RegExp(`/api/organizations/${organizationId}/members(\\?.*)?$`),
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const roleId = new URL(route.request().url()).searchParams.get('roleId');
        const rows =
          options.filterByRole && roleId
            ? members.filter((member) => member.roleIds?.includes(roleId))
            : members;
        await fulfillJson(route, 200, hydraCollection(rows));
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
  public async mockChannelList(
    channels: ReadonlyArray<ChannelOutputFixture> = [],
    organizationId = E2E_ORGANIZATION_ID,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/channels(\?.*)?$/, async (route) => {
      if (
        route.request().method() !== 'GET' ||
        new URL(route.request().url()).searchParams.get('organization') !== organizationId
      )
        return route.fallback();
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
   * Method mockChannelParent
   * @method mockChannelParent
   *
   * @description
   * Stubs the hierarchy write independently from detail and list reads.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ChannelOutputFixture} channel - Saved channel returned by the API.
   * @returns {Promise<void>}
   */
  public async mockChannelParent(channel: ChannelOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      new RegExp('/api/channels/' + channel.id + '/parent(\\?.*)?$'),
      async (route) => {
        await fulfillJson(route, 200, channel);
      },
    );
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
      if (
        route.request().method() !== 'GET' ||
        url.searchParams.get('organization') !== `/api/organizations/${organizationId}`
      )
        return route.fallback();
      const status = url.searchParams.get('status');
      const member = url.searchParams.get('member');
      const label = url.searchParams.get('label');
      const number = url.searchParams.get('number');

      const filtered = interventions
        .map((intervention) => this.interventionUpdates.get(intervention.id) ?? intervention)
        .filter((intervention) => {
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

      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      const size = Math.max(1, Number(url.searchParams.get('itemsPerPage') ?? 30));
      await fulfillJson(
        route,
        200,
        hydraCollection(filtered.slice((page - 1) * size, page * size), {
          totalItems: filtered.length,
        }),
      );
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
      this.interventionUpdates.set(interventionId, updated);
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
      const intervention = new URL(route.request().url()).searchParams.get('intervention');
      if (
        route.request().method() !== 'GET' ||
        intervention !== `/api/interventions/${interventionId}`
      )
        return route.fallback();
      await fulfillJson(
        route,
        200,
        this.interventionCollection(workItems, new URL(route.request().url())),
      );
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
        this.updatedInterventionRows.set(workItemId, updated);
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
      const intervention = new URL(route.request().url()).searchParams.get('intervention');
      if (
        route.request().method() !== 'GET' ||
        intervention !== `/api/interventions/${interventionId}`
      )
        return route.fallback();
      await fulfillJson(
        route,
        200,
        this.interventionCollection(changes, new URL(route.request().url())),
      );
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
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
        if (route.request().method() !== 'GET') return route.fallback();
        await fulfillJson(route, 200, hydraCollection(attachments));
      },
    );
  }

  /**
   * Mocks the canonical `GET /api/facilities?intervention=…` collection
   * loaded by the intervention detail's linked-resources tab. The query is
   * checked explicitly so this fixture cannot satisfy another facility read.
   */
  public async mockInterventionFacilities(
    interventionId: string,
    facilities: ReadonlyArray<FacilityOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/facilities(\\?.*)?$'), async (route) => {
      const intervention = new URL(route.request().url()).searchParams.get('intervention');
      if (
        route.request().method() !== 'GET' ||
        intervention !== `/api/interventions/${interventionId}`
      )
        return route.fallback();
      await fulfillJson(
        route,
        200,
        this.interventionCollection(facilities, new URL(route.request().url())),
      );
    });
  }

  /**
   * Mocks the canonical `GET /api/inspections?intervention=…` collection
   * loaded by the intervention detail's linked-resources tab. The intervention
   * query is checked explicitly so a fixture cannot satisfy a different read.
   */
  public async mockInterventionInspections(
    interventionId: string,
    inspections: ReadonlyArray<InspectionOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/inspections(\\?.*)?$'), async (route) => {
      const intervention = new URL(route.request().url()).searchParams.get('intervention');
      if (
        route.request().method() !== 'GET' ||
        intervention !== `/api/interventions/${interventionId}`
      )
        return route.fallback();
      await fulfillJson(
        route,
        200,
        this.interventionCollection(inspections, new URL(route.request().url())),
      );
    });
  }

  /**
   * Mocks the canonical `GET /api/equipment?intervention=…` collection loaded
   * by the intervention detail's linked-resources tab, with method and
   * intervention guards matching {@link mockInterventionInspections}.
   */
  public async mockInterventionEquipment(
    interventionId: string,
    equipment: ReadonlyArray<EquipmentOutputFixture> = [],
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp('/api/equipment(\\?.*)?$'), async (route) => {
      const intervention = new URL(route.request().url()).searchParams.get('intervention');
      if (
        route.request().method() !== 'GET' ||
        intervention !== `/api/interventions/${interventionId}`
      )
        return route.fallback();
      await fulfillJson(
        route,
        200,
        this.interventionCollection(equipment, new URL(route.request().url())),
      );
    });
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
  public async mockImportJobList(
    jobs: ReadonlyArray<ImportJobOutputFixture> = [],
    organizationId = E2E_ORGANIZATION_ID,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp(`/api/imports(\\?.*)?$`), async (route) => {
      if (
        route.request().method() !== 'GET' ||
        new URL(route.request().url()).searchParams.get('organization') !== organizationId
      )
        return route.fallback();
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
    organizationId = E2E_ORGANIZATION_ID,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(new RegExp(`/api/maintenance/schedules(\\?.*)?$`), async (route) => {
      if (
        route.request().method() !== 'GET' ||
        new URL(route.request().url()).searchParams.get('organization') !==
          `/api/organizations/${organizationId}`
      )
        return route.fallback();
      await fulfillJson(route, 200, hydraCollection(schedules));
    });
  }

  /**
   * Method mockDirectConversationList
   * @method mockDirectConversationList
   *
   * @description
   * Supplies the paged direct-message list used by the sidebar extension.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ReadonlyArray<ConversationOutputFixture>} conversations - Organization conversations.
   * @param {string} organizationId - Exact owning organization identifier.
   * @returns {Promise<void>} Resolves when the route is registered.
   */
  public async mockDirectConversationList(
    conversations: ReadonlyArray<ConversationOutputFixture>,
    organizationId = E2E_ORGANIZATION_ID,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/direct-conversations(\?.*)?$/, async (route) => {
      if (
        route.request().method() !== 'GET' ||
        new URL(route.request().url()).searchParams.get('organization') !==
          `/api/organizations/${organizationId}`
      )
        return route.fallback();
      await fulfillJson(route, 200, hydraCollection(conversations));
    });
  }

  /**
   * Method mockDirectConversationOpen
   * @method mockDirectConversationOpen
   *
   * @description
   * Resolves the member picker's get-or-create conversation request.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ConversationOutputFixture} conversation - Opened conversation.
   * @returns {Promise<void>} Resolves when the route is registered.
   */
  public async mockDirectConversationOpen(conversation: ConversationOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/direct-conversations$/, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, 200, conversation);
    });
  }

  /**
   * Method mockConversationDetail
   * @method mockConversationDetail
   * @description Resolves a saved message's exact conversation and owning organization without
   * acknowledging writes or other conversation identifiers.
   * @access public
   * @since 1.0.0
   * @param {ConversationOutputFixture} conversation - Organization-owned conversation fixture.
   * @returns {Promise<void>} Exact GET endpoint registered.
   */
  public async mockConversationDetail(conversation: ConversationOutputFixture): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(
      (url) => url.pathname === `/api/conversations/${conversation.id}` && url.search === '',
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await fulfillJson(route, 200, conversation);
      },
    );
  }

  /**
   * Method mockSavedMessages
   * @method mockSavedMessages
   *
   * @description
   * Supplies organization-scoped bookmarks for the messaging extension entry.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ReadonlyArray<MessageOutputFixture>} messages - Saved messages.
   * @param {string} organizationId - Exact owning organization identifier.
   * @returns {Promise<void>} Resolves when the route is registered.
   */
  public async mockSavedMessages(
    messages: ReadonlyArray<MessageOutputFixture> = [],
    organizationId = E2E_ORGANIZATION_ID,
  ): Promise<void> {
    await this.installSafetyNet();
    await this.page.route(/\/api\/saved-messages(\?.*)?$/, async (route) => {
      if (
        route.request().method() !== 'GET' ||
        new URL(route.request().url()).searchParams.get('organization') !== organizationId
      )
        return route.fallback();
      await fulfillJson(route, 200, hydraCollection(messages));
    });
  }

  /**
   * Method mockAccountVisualReads
   * @method mockAccountVisualReads
   * @description Supplies empty security catalogs and notification preferences for read-only
   * visual review. Does not register password, provider or preference mutations.
   * @access public
   * @since 1.0.0
   * @returns {Promise<void>} Account read endpoints registered behind the safety net.
   */
  public async mockAccountVisualReads(): Promise<void> {
    await this.installSafetyNet();
    for (const path of [
      'sessions',
      'trusted-devices',
      'auth/federated/providers',
      'notification-types',
    ]) {
      // eslint-disable-next-line no-await-in-loop -- Keep Playwright registration order explicit before the specific account routes.
      await this.page.route(new RegExp(`/api/${path}(\\?.*)?$`), async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await fulfillJson(route, 200, hydraCollection([]));
      });
    }
    await this.page.route(/\/api\/auth\/federated\/connections(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, {
        password_configured: true,
        last_sign_in_method: 'password',
        connections: [],
      });
    });
    await this.page.route(/\/api\/notifications\/preferences(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, 200, {
        '@id': '/api/notifications/preferences',
        '@type': 'NotificationPreferences',
        preferences: [],
      });
    });
  }
}
