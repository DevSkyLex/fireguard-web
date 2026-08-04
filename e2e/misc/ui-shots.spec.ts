import { expect, test, type Page } from '@playwright/test';
import {
  organizationOutput,
  type OrganizationOutputFixture,
} from '../support/fixtures/api-fixtures';
import {
  equipmentOutput,
  type EquipmentOutputFixture,
} from '../support/fixtures/equipment-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  inspectionOutput,
  type InspectionOutputFixture,
} from '../support/fixtures/inspection-fixtures';
import {
  interventionChangeOutput,
  interventionOutput,
  interventionWorkItemOutput,
  type InterventionChangeOutputFixture,
  type InterventionOutputFixture,
  type InterventionWorkItemOutputFixture,
} from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { AccountPage } from '../support/pages/account.page';
import { ErrorPage } from '../support/pages/error.page';
import { ForgotPasswordPage } from '../support/pages/forgot-password.page';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';
import { InterventionsPage } from '../support/pages/interventions.page';
import { LoginPage } from '../support/pages/login.page';
import { MaintenancePage } from '../support/pages/maintenance.page';
import { MfaVerifyPage } from '../support/pages/mfa-verify.page';
import { NewPasswordPage } from '../support/pages/new-password.page';
import { OnboardingPage } from '../support/pages/onboarding.page';
import { OrganizationOverviewPage } from '../support/pages/organization-overview.page';
import { PasswordResetVerifyPage } from '../support/pages/password-reset-verify.page';
import { RegisterVerifyPage } from '../support/pages/register-verify.page';
import { RegisterPage } from '../support/pages/register.page';

/**
 * UI screenshot harness — captures a full-page screenshot of every route in
 * the "routes to capture" matrix, in 4 variants: {light, dark} x {desktop
 * 1280x800, mobile 375x812}.
 *
 * Hermetic like the rest of the suite: every backend call goes through
 * `ApiMock` (`e2e/support/mocks/api-mock.ts`) plus a handful of spec-local
 * `page.route()` mocks for endpoints `ApiMock` does not cover yet (channels,
 * conversations, direct messages, saved messages — mirroring the pattern
 * already used by `e2e/workspace/workspace-channels.spec.ts` and
 * `workspace-conversation.spec.ts`), and reference-data collections for the
 * facilities/equipments/inspections reference lists (empty `hydraCollection`,
 * the same shape `ApiMock.mockInterventionPlanningOptions` already returns).
 *
 * Theme is applied BEFORE navigation via the `theme-preference` cookie
 * (`src/app/core/theme/services/theme/theme.service.ts`), read synchronously
 * by `ThemeService` on construction — no SSR involved, the `e2e` build is a
 * client-only SPA (`ssr: false`), so the cookie only needs to exist in
 * `document.cookie` before Angular bootstraps.
 *
 * Filter a run by area with `--grep`, e.g. `--grep "^auth:"` or
 * `--grep "^organization:"`. Areas: auth, onboarding, misc, account,
 * organization, facilities, equipments, inspections, interventions, workspace,
 * overlays.
 */

//#region Fixtures
/** The one organization every authenticated scenario resolves into. */
const ORGANIZATION: OrganizationOutputFixture = organizationOutput();

/** The one intervention the detail-page scenario deep-links into. */
const INTERVENTION = interventionOutput();

/**
 * Local noon today for every intervention's `plannedStartAt`: the calendar
 * view opens on the current month, so a fixture dated relative to "now" (at
 * noon, to stay on today's date in every timezone the run might use) is the
 * only way the calendar shows an event at all.
 */
const NOW = new Date();
const PLANNED_START_AT = new Date(
  NOW.getFullYear(),
  NOW.getMonth(),
  NOW.getDate(),
  12,
  0,
  0,
).toISOString();

/** A handful of interventions spanning distinct board lanes for the list/board/calendar shots. */
const INTERVENTIONS = [
  interventionOutput({
    id: 'i-draft',
    name: 'Draft walkthrough',
    status: 'draft',
    plannedStartAt: PLANNED_START_AT,
  }),
  interventionOutput({
    id: 'i-planned',
    name: 'Planned audit',
    status: 'planned',
    plannedStartAt: PLANNED_START_AT,
  }),
  interventionOutput({
    id: 'i-progress',
    name: 'Ongoing check',
    status: 'in_progress',
    plannedStartAt: PLANNED_START_AT,
  }),
  interventionOutput({
    id: 'i-submitted',
    name: 'Awaiting review',
    status: 'submitted',
    plannedStartAt: PLANNED_START_AT,
  }),
];

/** The one facility the detail/edit page scenarios deep-link into. */
const FACILITY = facilityOutput();

/** The one equipment the detail/edit page scenarios deep-link into. */
const EQUIPMENT = equipmentOutput();

/** The one inspection the detail/edit page scenarios deep-link into. */
const INSPECTION = inspectionOutput();

/** Facility-scoped equipment populating the facility detail page's Overview tab. */
const FACILITY_EQUIPMENT: readonly EquipmentOutputFixture[] = [
  equipmentOutput({ id: 'e2e-fac-equip-1' }),
  equipmentOutput({
    id: 'e2e-fac-equip-2',
    type: 'smoke_detector',
    subType: null,
    brand: 'Bosch',
    model: 'Avenar 4000',
    serialNumber: 'SN-2024-088',
    locationLabel: 'Server room',
    status: 'under_maintenance',
  }),
];

/** Facility-scoped inspections populating the facility detail page's Overview tab. */
const FACILITY_INSPECTIONS: readonly InspectionOutputFixture[] = [
  inspectionOutput({ id: 'e2e-fac-insp-1' }),
  inspectionOutput({
    id: 'e2e-fac-insp-2',
    equipmentId: 'e2e-fac-equip-2',
    performedAt: '2026-07-10T14:00:00+00:00',
    result: 'fail',
    status: 'submitted',
    notes: 'Detector failed self-test, replacement ordered.',
  }),
];

/**
 * Distinct intervention fixtures for the `interventions: workspace <phase>`
 * scenarios — one per lifecycle phase, each populated with what makes that
 * phase legible: work items with progress in `in_progress`, a review note in
 * `changes_requested`, a bumped revision once `published`.
 */
const INTERVENTION_DRAFT = interventionOutput({
  id: 'i-phase-draft',
  name: 'Q3 fire safety walkthrough',
  description: 'Full walkthrough of the north campus ahead of the Q3 compliance audit.',
  status: 'draft',
  allowedTransitions: ['planned', 'abandoned'],
  plannedStartAt: null,
  dueAt: null,
  revision: 0,
  facilitiesCount: 1,
});

const INTERVENTION_PLANNED = interventionOutput({
  id: 'i-phase-planned',
  name: 'Warehouse sprinkler inspection',
  description: 'Scheduled inspection of the warehouse sprinkler network.',
  status: 'planned',
  allowedTransitions: ['in_progress', 'abandoned'],
  priority: 'high',
  plannedStartAt: '2026-08-20T09:00:00+00:00',
  dueAt: '2026-08-25T17:00:00+00:00',
  facilitiesCount: 1,
  equipmentCount: 4,
});

/** Mixed-progress checklist for the `in_progress` workspace scenario. */
const INTERVENTION_IN_PROGRESS_WORK_ITEMS: readonly InterventionWorkItemOutputFixture[] = [
  interventionWorkItemOutput({
    id: 'e2e-wi-1',
    action: 'inspect',
    targetSummary: 'Fire extinguisher — Corridor A',
    status: 'completed',
  }),
  interventionWorkItemOutput({
    id: 'e2e-wi-2',
    action: 'inspect',
    targetSummary: 'Smoke detector — Server room',
    status: 'completed',
  }),
  interventionWorkItemOutput({
    id: 'e2e-wi-3',
    action: 'inspect',
    targetSummary: 'Fire door — East wing',
    status: 'planned',
  }),
];

const INTERVENTION_IN_PROGRESS = interventionOutput({
  id: 'i-phase-progress',
  name: 'North Building annual inspection',
  description: 'Annual fire-safety inspection of the North Building.',
  status: 'in_progress',
  plannedStartAt: '2026-08-01T09:00:00+00:00',
  dueAt: '2026-08-10T17:00:00+00:00',
  revision: 1,
  facilitiesCount: 1,
  equipmentCount: 3,
  inspectionsCount: 2,
  workItemsCount: INTERVENTION_IN_PROGRESS_WORK_ITEMS.length,
  completedWorkItemsCount: 2,
});

/** One proposed change awaiting publication, for the `submitted` workspace scenario. */
const INTERVENTION_SUBMITTED_CHANGES: readonly InterventionChangeOutputFixture[] = [
  interventionChangeOutput({
    id: 'e2e-chg-1',
    resource: 'equipment/e2e-fac-equip-1',
    patch: { status: 'operational' },
  }),
];

const INTERVENTION_SUBMITTED = interventionOutput({
  id: 'i-phase-submitted',
  name: 'Workshop compliance review',
  description: 'Submitted for review after completing the workshop checklist.',
  status: 'submitted',
  allowedTransitions: ['published', 'changes_requested'],
  priority: 'high',
  plannedStartAt: '2026-07-28T09:00:00+00:00',
  dueAt: '2026-08-12T17:00:00+00:00',
  revision: 2,
  facilitiesCount: 1,
  equipmentCount: 5,
  inspectionsCount: 3,
  proposedChangesCount: INTERVENTION_SUBMITTED_CHANGES.length,
});

const INTERVENTION_CHANGES_REQUESTED = interventionOutput({
  id: 'i-phase-changes',
  name: 'East wing evacuation route check',
  description: 'Reviewer sent this back for additional evidence.',
  status: 'changes_requested',
  allowedTransitions: ['in_progress', 'abandoned'],
  reviewNote:
    'The fire door inspection photo is missing — please add evidence before resubmitting.',
  plannedStartAt: '2026-07-20T09:00:00+00:00',
  dueAt: '2026-08-15T17:00:00+00:00',
  revision: 2,
  facilitiesCount: 1,
  equipmentCount: 2,
  inspectionsCount: 1,
});

const INTERVENTION_PUBLISHED = interventionOutput({
  id: 'i-phase-published',
  name: 'South Facility Q2 inspection',
  description: 'Published after the Q2 compliance cycle.',
  status: 'published',
  allowedTransitions: [],
  plannedStartAt: '2026-06-01T09:00:00+00:00',
  dueAt: '2026-06-10T17:00:00+00:00',
  revision: 4,
  facilitiesCount: 1,
  equipmentCount: 6,
  inspectionsCount: 4,
});
//#endregion

//#region Spec-local mocks (channels, conversations, saved — not yet in ApiMock)
interface ChannelRow {
  readonly id: string;
  readonly name: string;
}

/** Mocks `GET /api/channels` (the sidebar channel nav). */
async function mockChannelsList(page: Page, rows: readonly ChannelRow[]): Promise<void> {
  await page.route(/\/api\/channels(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/channels',
        '@type': 'Collection',
        totalItems: rows.length,
        member: rows.map((row) => ({
          '@id': `/.well-known/genid/${row.id}`,
          '@type': 'ChannelOutput',
          id: row.id,
          organization: `/api/organizations/${ORGANIZATION.id}`,
          name: row.name,
          participantCount: 3,
          isArchived: false,
          messagesCount: 4,
          unreadCount: 0,
          createdAt: '2026-01-01T00:00:00+00:00',
          updatedAt: '2026-01-01T00:00:00+00:00',
          isFavorite: false,
        })),
      }),
    });
  });
}

/** Mocks `GET /api/channels/{id}` (the conversation column's header). */
async function mockSingleChannel(page: Page, channelId: string, name: string): Promise<void> {
  await page.route(new RegExp(`/api/channels/${channelId}$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': `/.well-known/genid/${channelId}`,
        '@type': 'ChannelOutput',
        id: channelId,
        organization: `/api/organizations/${ORGANIZATION.id}`,
        name,
        participantCount: 3,
        isArchived: false,
        messagesCount: 4,
        unreadCount: 0,
        createdAt: '2026-01-01T00:00:00+00:00',
        updatedAt: '2026-01-01T00:00:00+00:00',
        isFavorite: false,
      }),
    });
  });
}

interface MessageRow {
  readonly id: string;
  readonly author: string;
  readonly authorDisplayName: string;
  readonly body: string;
  readonly createdAt: string;
}

function messagePayload(conversationId: string, row: MessageRow): Record<string, unknown> {
  return {
    '@id': `/api/messages/${row.id}`,
    '@type': 'MessageOutput',
    id: row.id,
    conversation: `/api/conversations/${conversationId}`,
    authorMember: `/api/organizations/${ORGANIZATION.id}/members/${row.author}`,
    authorDisplayName: row.authorDisplayName,
    body: row.body,
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
  };
}

/** Mocks `GET /api/conversations/{id}/messages` — shared by channels and direct conversations. */
async function mockThreadMessages(
  page: Page,
  conversationId: string,
  rows: readonly MessageRow[],
): Promise<void> {
  await page.route(/\/api\/conversations\/[^/]+\/messages(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': `/api/conversations/${conversationId}/messages`,
        '@type': 'Collection',
        totalItems: rows.length,
        member: rows.map((row) => messagePayload(conversationId, row)),
      }),
    });
  });
}

/** Mocks `GET /api/direct-conversations` — the only source of a direct conversation's counterpart. */
async function mockDirectConversationsList(
  page: Page,
  rows: readonly { id: string; counterpartMemberId: string }[],
): Promise<void> {
  await page.route(/\/api\/direct-conversations(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/direct-conversations',
        '@type': 'Collection',
        totalItems: rows.length,
        member: rows.map((row) => ({
          '@id': `/.well-known/genid/${row.id}`,
          '@type': 'ConversationOutput',
          id: row.id,
          organization: `/api/organizations/${ORGANIZATION.id}`,
          subjectType: 'direct',
          visibility: 'participants',
          messagesCount: 3,
          isArchived: false,
          unreadCount: 0,
          createdAt: '2026-01-01T00:00:00+00:00',
          updatedAt: '2026-01-01T00:00:00+00:00',
          isChannel: false,
          isFavorite: false,
          counterpartMember: `/api/organizations/${ORGANIZATION.id}/members/${row.counterpartMemberId}`,
        })),
      }),
    });
  });
}

/** Mocks `GET /api/organizations/{id}/members` — the member directory (mentions, direct-conversation names). */
async function mockMembersDirectory(
  page: Page,
  rows: readonly { id: string; displayName: string }[],
): Promise<void> {
  await page.route(
    new RegExp(`/api/organizations/${ORGANIZATION.id}/members(\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': `/api/organizations/${ORGANIZATION.id}/members`,
          '@type': 'Collection',
          totalItems: rows.length,
          member: rows.map((row) => ({
            '@id': `/api/organizations/${ORGANIZATION.id}/members/${row.id}`,
            '@type': 'OrganizationMemberOutput',
            id: row.id,
            displayName: row.displayName,
            roleNames: ['Member'],
            isActive: true,
          })),
        }),
      });
    },
  );
}

/** Mocks `GET /api/saved-messages`. */
async function mockSavedMessages(page: Page, rows: readonly MessageRow[]): Promise<void> {
  await page.route(/\/api\/saved-messages(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/saved-messages',
        '@type': 'Collection',
        totalItems: rows.length,
        member: rows.map((row) => ({ ...messagePayload('saved', row), isSaved: true })),
      }),
    });
  });
}

/**
 * Mocks the one channel `overlays: assistant-panel` and `overlays:
 * channel-info-panel` deep-link into — the same shape as
 * `channelConversationRun`, kept as its own function rather than shared with
 * it so that scenario's mocks stay exactly as they are.
 */
async function mockChannelWorkspaceForOverlay(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await mockChannelsList(page, [{ id: 'c1', name: 'North Building' }]);
  await mockSingleChannel(page, 'c1', 'North Building');
  await mockThreadMessages(page, 'c1', [
    {
      id: 'm1',
      author: 'member-1',
      authorDisplayName: 'Amelie Rousseau',
      body: '<p>Extinguisher checked, all good.</p>',
      createdAt: '2026-07-20T09:00:00+00:00',
    },
  ]);
  await mockDirectConversationsList(page, []);
}

/**
 * Mocks an empty Hydra collection at the given pattern — the same shape
 * `hydraCollection([])` already produces elsewhere in the suite, reused here
 * for the facilities/equipments/inspections reference-data endpoints that
 * `ApiMock` does not cover (see `e2e/README.md`'s documented CRUD-coverage gap).
 */
async function mockEmptyCollection(page: Page, pattern: RegExp): Promise<void> {
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': 'e2e-empty',
        '@type': 'Collection',
        totalItems: 0,
        member: [],
      }),
    });
  });
}

/** Extra reference-data endpoint the inspections list reads beyond `mockInterventionPlanningOptions`. */
async function mockInspectionsReferenceData(page: Page): Promise<void> {
  await mockEmptyCollection(
    page,
    new RegExp(`/api/organizations/${ORGANIZATION.id}/inspections(\\?.*)?$`),
  );
}

/** Extra reference-data endpoints the inspection-create form reads (checklists, on top of inspections). */
async function mockInspectionCreateReferenceData(page: Page): Promise<void> {
  await mockInspectionsReferenceData(page);
  await mockEmptyCollection(
    page,
    new RegExp(`/api/organizations/${ORGANIZATION.id}/checklists(\\?.*)?$`),
  );
}
//#endregion

//#region Scenarios
interface Scenario {
  readonly area: string;
  readonly name: string;
  readonly slug: string;
  readonly run: (page: Page) => Promise<void>;
}

/** An organization-scoped page gated only by `organizationAccessGuard`/`organizationPermissionGuard`. */
function organizationPermissionPageRun(segment: string, readySelector: string): Scenario['run'] {
  return async (page: Page): Promise<void> => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await page.goto(`/organizations/${ORGANIZATION.id}/${segment}`);
    await expect(page.locator(readySelector)).toBeVisible({ timeout: 15_000 });
  };
}

/**
 * A facilities/equipments/inspections list or create page: org access plus
 * the reference-data collections those pages read (facilities, equipment,
 * equipment-types via the reused `mockInterventionPlanningOptions`, and any
 * `extraMocks` a given domain needs beyond that).
 */
function referenceDataPageRun(
  routeSuffix: string,
  readySelector: string,
  extraMocks?: (page: Page) => Promise<void>,
): Scenario['run'] {
  return async (page: Page): Promise<void> => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await api.mockInterventionPlanningOptions(ORGANIZATION.id);
    if (extraMocks) await extraMocks(page);
    await page.goto(`/organizations/${ORGANIZATION.id}/${routeSuffix}`);
    await expect(page.locator(readySelector)).toBeVisible({ timeout: 15_000 });
  };
}

/** The interventions index page, one variant per `?view=` tab. */
function interventionsViewRun(view: 'list' | 'board' | 'calendar'): Scenario['run'] {
  return async (page: Page): Promise<void> => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await api.mockInterventionPlanningOptions(ORGANIZATION.id);
    await api.mockInterventionList(INTERVENTIONS);
    await page.goto(`/organizations/${ORGANIZATION.id}/interventions?view=${view}`);
    const interventionsPage = new InterventionsPage(page);
    await expect(interventionsPage.root).toBeVisible({ timeout: 15_000 });
    if (view === 'board') await expect(interventionsPage.board).toBeVisible({ timeout: 15_000 });
    if (view === 'calendar')
      await expect(interventionsPage.calendar).toBeVisible({ timeout: 15_000 });
  };
}

/** The facility detail page, its Overview tab populated with a small equipment/inspection preview. */
async function facilityDetailRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockFacilityDetail(ORGANIZATION.id, FACILITY);
  await api.mockFacilityOverview(ORGANIZATION.id, FACILITY.id, {
    equipment: FACILITY_EQUIPMENT,
    inspections: FACILITY_INSPECTIONS,
  });
  await page.goto(`/organizations/${ORGANIZATION.id}/facilities/${FACILITY.id}`);
  await expect(page.locator('#facility-detail')).toBeVisible({ timeout: 15_000 });
}

/** The facility edit page — `FacilityForm` needs no reference data of its own (section 10.4). */
async function facilityEditRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockFacilityDetail(ORGANIZATION.id, FACILITY);
  await page.goto(`/organizations/${ORGANIZATION.id}/facilities/${FACILITY.id}/edit`);
  await expect(page.locator('#facility-edit')).toBeVisible({ timeout: 15_000 });
}

/**
 * The equipment detail page. Its Overview tab needs only the equipment itself;
 * the attachments/maintenance-log tables load unconditionally in the
 * constructor (empty is enough since only Overview is captured), and the
 * assignment panel's facility options reuse `mockInterventionPlanningOptions`.
 */
async function equipmentDetailRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockEquipmentDetail(ORGANIZATION.id, EQUIPMENT);
  await api.mockInterventionPlanningOptions(ORGANIZATION.id);
  await mockEmptyCollection(
    page,
    new RegExp(
      `/api/organizations/${ORGANIZATION.id}/equipment/${EQUIPMENT.id}/attachments(\\?.*)?$`,
    ),
  );
  await mockEmptyCollection(
    page,
    new RegExp(
      `/api/organizations/${ORGANIZATION.id}/equipment/${EQUIPMENT.id}/maintenance-logs(\\?.*)?$`,
    ),
  );
  await page.goto(`/organizations/${ORGANIZATION.id}/equipments/${EQUIPMENT.id}`);
  await expect(page.locator('#equipment-detail')).toBeVisible({ timeout: 15_000 });
}

/** The equipment edit page — `EquipmentForm` needs no reference data of its own (section 10.4). */
async function equipmentEditRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockEquipmentDetail(ORGANIZATION.id, EQUIPMENT);
  await page.goto(`/organizations/${ORGANIZATION.id}/equipments/${EQUIPMENT.id}/edit`);
  await expect(page.locator('#equipment-edit')).toBeVisible({ timeout: 15_000 });
}

/** The inspection edit page — reads the same equipment/facility/checklist reference data as inspection create. */
async function inspectionEditRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockInspectionDetail(ORGANIZATION.id, INSPECTION);
  await api.mockInterventionPlanningOptions(ORGANIZATION.id);
  await mockInspectionCreateReferenceData(page);
  await page.goto(`/organizations/${ORGANIZATION.id}/inspections/${INSPECTION.id}/edit`);
  await expect(page.locator('#inspection-edit')).toBeVisible({ timeout: 15_000 });
}

/** The inspection detail page — Overview tab, with an empty non-conformity collection. */
async function inspectionDetailRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockInspectionDetail(ORGANIZATION.id, INSPECTION);
  await mockEmptyCollection(
    page,
    new RegExp(
      `/api/organizations/${ORGANIZATION.id}/inspections/${INSPECTION.id}/non-conformities(\\?.*)?$`,
    ),
  );
  await page.goto(`/organizations/${ORGANIZATION.id}/inspections/${INSPECTION.id}`);
  await expect(page.locator('#inspection-detail')).toBeVisible({ timeout: 15_000 });
}

/**
 * The facility create page driven into a mocked quota 409 so the actionable
 * upgrade dialog is the captured subject.
 */
async function quotaDialogRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await page.route(
    new RegExp(`/api/organizations/${ORGANIZATION.id}/facilities$`),
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 409,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': '/api/errors/409',
          '@type': 'Error',
          status: 409,
          type: '/errors/409',
          title: 'Conflict',
          detail: 'Facility quota exceeded for the current plan.',
        }),
      });
    },
  );
  await page.goto(`/organizations/${ORGANIZATION.id}/facilities/create`);
  await expect(page.locator('#facility-create')).toBeVisible({ timeout: 15_000 });
  await page.locator('#type').click();
  await page.getByRole('option').first().click();
  await page.locator('#name').fill('Quota Capped Site');
  await page.getByRole('button', { name: 'Create Facility' }).click();
  await expect(page.getByRole('dialog')).toContainText('Plan limit reached', { timeout: 15_000 });
}

/** The intervention workspace at a given lifecycle phase, mirroring the `interventions: detail` scenario's setup. */
function interventionWorkspaceRun(
  intervention: InterventionOutputFixture,
  options: {
    workItems?: ReadonlyArray<InterventionWorkItemOutputFixture>;
    changes?: ReadonlyArray<InterventionChangeOutputFixture>;
  } = {},
): Scenario['run'] {
  return async (page: Page): Promise<void> => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkspace(intervention.id, options);
    await api.mockInterventionPlanningOptions(ORGANIZATION.id);
    await new InterventionDetailPage(page).goto(ORGANIZATION.id, intervention.id);
  };
}

async function channelConversationRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await mockChannelsList(page, [
    { id: 'c1', name: 'North Building' },
    { id: 'c2', name: 'Workshop Site' },
  ]);
  await mockSingleChannel(page, 'c1', 'North Building');
  await mockThreadMessages(page, 'c1', [
    {
      id: 'm1',
      author: 'member-1',
      authorDisplayName: 'Amelie Rousseau',
      body: '<p>Extinguisher checked, all good.</p>',
      createdAt: '2026-07-20T09:00:00+00:00',
    },
    {
      id: 'm2',
      author: 'member-2',
      authorDisplayName: 'Bruno Lemaire',
      body: '<p>Thanks, noted.</p>',
      createdAt: '2026-07-20T09:05:00+00:00',
    },
  ]);
  await page.goto(`/organizations/${ORGANIZATION.id}/channels/c1`);
  await expect(page.getByTestId('channel-conversation')).toBeVisible({ timeout: 15_000 });
}

async function directConversationRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await mockDirectConversationsList(page, [{ id: 'dc1', counterpartMemberId: 'member-9' }]);
  await mockMembersDirectory(page, [{ id: 'member-9', displayName: 'Bruno Lemaire' }]);
  await mockThreadMessages(page, 'dc1', [
    {
      id: 'm1',
      author: 'member-9',
      authorDisplayName: 'Bruno Lemaire',
      body: '<p>On my way to the site.</p>',
      createdAt: '2026-07-20T09:00:00+00:00',
    },
  ]);
  await page.goto(`/organizations/${ORGANIZATION.id}/direct/dc1`);
  await expect(page.getByTestId('direct-conversation')).toBeVisible({ timeout: 15_000 });
}

async function savedMessagesRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await mockSavedMessages(page, [
    {
      id: 'm9',
      author: 'member-1',
      authorDisplayName: 'Amelie Rousseau',
      body: '<p>Annual report to review.</p>',
      createdAt: '2026-07-20T09:00:00+00:00',
    },
  ]);
  await page.goto(`/organizations/${ORGANIZATION.id}/saved`);
  await expect(page.getByTestId('saved-messages')).toBeVisible({ timeout: 15_000 });
}

/** Interventions list → "New intervention" → the guided creation drawer. */
async function interventionCreateDrawerRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockInterventionPlanningOptions(ORGANIZATION.id);
  await api.mockInterventionList(INTERVENTIONS);
  await new InterventionsPage(page).goto(ORGANIZATION.id);
  await page.getByRole('button', { name: 'New intervention' }).click();
  await expect(page.getByText('Create a field intervention')).toBeVisible({ timeout: 15_000 });
}

/** A draft workspace → "Edit planning" → the planning-details edit drawer. */
async function interventionEditDrawerRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockInterventionDetail(INTERVENTION_DRAFT);
  await api.mockInterventionWorkspace(INTERVENTION_DRAFT.id);
  await api.mockInterventionPlanningOptions(ORGANIZATION.id);
  await new InterventionDetailPage(page).goto(ORGANIZATION.id, INTERVENTION_DRAFT.id);
  await page.getByRole('button', { name: 'Edit planning' }).click();
  await expect(page.getByText('Edit details', { exact: true })).toBeVisible({ timeout: 15_000 });
}

/** Any workspace page → the header bell → the notification popover (empty state). */
async function notificationBellRun(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await page.goto(`/organizations/${ORGANIZATION.id}/members`);
  await expect(page.locator('#organization-members')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByText('No notifications yet')).toBeVisible({ timeout: 15_000 });
}

/** A channel route → the header's assistant toggle → the assistant panel. */
async function assistantPanelRun(page: Page): Promise<void> {
  await mockChannelWorkspaceForOverlay(page);
  await page.goto(`/organizations/${ORGANIZATION.id}/channels/c1`);
  await expect(page.getByTestId('channel-conversation')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('assistant-toggle').click();
  await expect(page.getByTestId('assistant-intro')).toBeVisible({ timeout: 15_000 });
}

/**
 * A channel route → the header's info toggle → the channel info panel.
 *
 * The panel is already showing by default on desktop (`panelVisible` defaults
 * open) but hidden by default on mobile (the shell force-closes it below the
 * `lg` breakpoint), so the toggle is only clicked when it is not already the
 * panel on screen — clicking an already-open toggle would close it instead.
 */
async function channelInfoPanelRun(page: Page): Promise<void> {
  await mockChannelWorkspaceForOverlay(page);
  await page.goto(`/organizations/${ORGANIZATION.id}/channels/c1`);
  await expect(page.getByTestId('channel-conversation')).toBeVisible({ timeout: 15_000 });
  const toggle = page.getByTestId('channel-info-toggle');
  await expect(toggle).toBeVisible({ timeout: 15_000 });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(page.locator('#workspace-panel')).toBeVisible({ timeout: 15_000 });
}

const SCENARIOS: readonly Scenario[] = [
  // ── auth (SplitLayout, unauthenticated) ──────────────────────────────────
  {
    area: 'auth',
    name: 'login',
    slug: 'auth-login',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await new LoginPage(page).goto();
    },
  },
  {
    area: 'auth',
    name: 'register',
    slug: 'auth-register',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await new RegisterPage(page).goto();
    },
  },
  {
    area: 'auth',
    name: 'register verify',
    slug: 'auth-register-verify',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await api.mockRegisterSuccess();
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.fillForm({
        firstName: 'Ella',
        lastName: 'Uzer',
        email: 'e2e.user@fireguard.test',
        password: 'Sup3rSecret!',
      });
      await registerPage.submit();
      await new RegisterVerifyPage(page).waitForLoad();
    },
  },
  {
    area: 'auth',
    name: 'mfa verify',
    slug: 'auth-mfa-verify',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await api.mockLoginMfaRequired();
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('mfa.user@fireguard.test', 'Sup3rSecret!');
      await new MfaVerifyPage(page).waitForLoad();
    },
  },
  {
    area: 'auth',
    name: 'forgot password',
    slug: 'auth-forgot-password',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await new ForgotPasswordPage(page).goto();
    },
  },
  {
    area: 'auth',
    name: 'password reset verify',
    slug: 'auth-password-reset-verify',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await api.mockPasswordResetRequestSuccess();
      const forgotPasswordPage = new ForgotPasswordPage(page);
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset('e2e.user@fireguard.test');
      await new PasswordResetVerifyPage(page).waitForLoad();
    },
  },
  {
    area: 'auth',
    name: 'password reset new',
    slug: 'auth-password-reset-new',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await api.mockPasswordResetRequestSuccess();
      const forgotPasswordPage = new ForgotPasswordPage(page);
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset('e2e.user@fireguard.test');
      const verifyPage = new PasswordResetVerifyPage(page);
      await verifyPage.waitForLoad();
      await verifyPage.verify('123456');
      await new NewPasswordPage(page).waitForLoad();
    },
  },

  // ── onboarding (SplitLayout, authenticated, incomplete onboarding) ──────
  {
    area: 'onboarding',
    name: 'welcome',
    slug: 'onboarding-welcome',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession({ onboarding: { state: 'in_progress' } });
      await new OnboardingPage(page).goto();
    },
  },

  // ── misc (FocusedLayout, no guards) ──────────────────────────────────────
  {
    area: 'misc',
    name: '404',
    slug: 'misc-error-404',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await new ErrorPage(page).goto('/error/404');
    },
  },
  {
    area: 'misc',
    name: '403',
    slug: 'misc-error-403',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await new ErrorPage(page).goto('/error/403');
    },
  },
  {
    area: 'misc',
    name: '500',
    slug: 'misc-error-500',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await new ErrorPage(page).goto('/error/500');
    },
  },
  {
    area: 'misc',
    name: 'maintenance',
    slug: 'misc-maintenance',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await new MaintenancePage(page).goto();
    },
  },

  // ── account (workspace shell, authenticated) ─────────────────────────────
  {
    area: 'account',
    name: 'profile',
    slug: 'account-profile',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await new AccountPage(page).goto('profile');
    },
  },
  {
    area: 'account',
    name: 'settings',
    slug: 'account-settings',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await new AccountPage(page).goto('settings');
    },
  },
  {
    area: 'account',
    name: 'security',
    slug: 'account-security',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await new AccountPage(page).goto('security');
    },
  },
  {
    area: 'account',
    name: 'notifications',
    slug: 'account-notifications',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await new AccountPage(page).goto('notifications');
    },
  },

  // ── organization (workspace shell, authenticated) ────────────────────────
  {
    area: 'organization',
    name: 'dashboard',
    slug: 'organization-dashboard',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
      const overview = new OrganizationOverviewPage(page);
      await overview.goto(ORGANIZATION.id);
      // Below the desktop breakpoint the shell URL-shape-matches the bare
      // organization root to "still on the list pane" and keeps `main`
      // hidden (see `workspace-channels.spec.ts`'s "opens the overview pane
      // from the sidebar even though its path is empty"); tap the sidebar's
      // own Dashboard link to switch pane, exactly as a mobile member would.
      if (!(await overview.root.isVisible())) {
        await page
          .locator('app-organization-workspace-nav')
          .getByRole('link', { name: 'Dashboard' })
          .click();
      }
      await expect(overview.root).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    area: 'organization',
    name: 'members',
    slug: 'organization-members',
    run: organizationPermissionPageRun('members', '#organization-members'),
  },
  {
    area: 'organization',
    name: 'team',
    slug: 'organization-team',
    run: organizationPermissionPageRun('team', '#organization-team'),
  },
  {
    area: 'organization',
    name: 'settings',
    slug: 'organization-settings',
    run: organizationPermissionPageRun('settings', '#organization-settings'),
  },
  {
    area: 'organization',
    name: 'invitation accept',
    slug: 'organization-invitation-accept',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockUnauthenticatedSession();
      await page.goto('/organizations/invitations/accept');
      await expect(page.getByText('Organization invitation')).toBeVisible({ timeout: 15_000 });
    },
  },

  // ── facilities (list, create, detail, edit) ──────────────────────────────
  {
    area: 'facilities',
    name: 'list',
    slug: 'facilities-list',
    run: referenceDataPageRun('facilities', '#facility-list'),
  },
  {
    area: 'facilities',
    name: 'create',
    slug: 'facilities-create',
    run: referenceDataPageRun('facilities/create', '#facility-create'),
  },
  {
    area: 'facilities',
    name: 'detail',
    slug: 'facilities-detail',
    run: facilityDetailRun,
  },
  {
    area: 'facilities',
    name: 'edit',
    slug: 'facilities-edit',
    run: facilityEditRun,
  },

  // ── equipments (list, create, detail, edit) ──────────────────────────────
  {
    area: 'equipments',
    name: 'list',
    slug: 'equipments-list',
    run: referenceDataPageRun('equipments', '#equipment-list'),
  },
  {
    area: 'equipments',
    name: 'create',
    slug: 'equipments-create',
    run: referenceDataPageRun('equipments/create', '#equipment-create'),
  },
  {
    area: 'equipments',
    name: 'detail',
    slug: 'equipments-detail',
    run: equipmentDetailRun,
  },
  {
    area: 'equipments',
    name: 'edit',
    slug: 'equipments-edit',
    run: equipmentEditRun,
  },

  // ── inspections (list, create, detail, edit) ─────────────────────────────
  {
    area: 'inspections',
    name: 'list',
    slug: 'inspections-list',
    run: referenceDataPageRun('inspections', '#inspection-list', mockInspectionsReferenceData),
  },
  {
    area: 'inspections',
    name: 'create',
    slug: 'inspections-create',
    run: referenceDataPageRun(
      'inspections/create',
      '#inspection-create',
      mockInspectionCreateReferenceData,
    ),
  },
  {
    area: 'inspections',
    name: 'detail',
    slug: 'inspections-detail',
    run: inspectionDetailRun,
  },
  {
    area: 'inspections',
    name: 'edit',
    slug: 'inspections-edit',
    run: inspectionEditRun,
  },

  // ── interventions (workspace shell, authenticated) ───────────────────────
  {
    area: 'interventions',
    name: 'list view',
    slug: 'interventions-list',
    run: interventionsViewRun('list'),
  },
  {
    area: 'interventions',
    name: 'board view',
    slug: 'interventions-board',
    run: interventionsViewRun('board'),
  },
  {
    area: 'interventions',
    name: 'calendar view',
    slug: 'interventions-calendar',
    run: interventionsViewRun('calendar'),
  },
  {
    area: 'interventions',
    name: 'detail',
    slug: 'interventions-detail',
    run: async (page) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
      await api.mockInterventionDetail(INTERVENTION);
      await api.mockInterventionWorkspace(INTERVENTION.id);
      await api.mockInterventionPlanningOptions(ORGANIZATION.id);
      await new InterventionDetailPage(page).goto(ORGANIZATION.id, INTERVENTION.id);
    },
  },
  {
    area: 'interventions',
    name: 'workspace draft',
    slug: 'interventions-workspace-draft',
    run: interventionWorkspaceRun(INTERVENTION_DRAFT),
  },
  {
    area: 'interventions',
    name: 'workspace planned',
    slug: 'interventions-workspace-planned',
    run: interventionWorkspaceRun(INTERVENTION_PLANNED),
  },
  {
    area: 'interventions',
    name: 'workspace in_progress',
    slug: 'interventions-workspace-in-progress',
    run: interventionWorkspaceRun(INTERVENTION_IN_PROGRESS, {
      workItems: INTERVENTION_IN_PROGRESS_WORK_ITEMS,
    }),
  },
  {
    area: 'interventions',
    name: 'workspace submitted',
    slug: 'interventions-workspace-submitted',
    run: interventionWorkspaceRun(INTERVENTION_SUBMITTED, {
      changes: INTERVENTION_SUBMITTED_CHANGES,
    }),
  },
  {
    area: 'interventions',
    name: 'workspace published',
    slug: 'interventions-workspace-published',
    run: interventionWorkspaceRun(INTERVENTION_PUBLISHED),
  },
  {
    area: 'interventions',
    name: 'workspace changes-requested',
    slug: 'interventions-workspace-changes-requested',
    run: interventionWorkspaceRun(INTERVENTION_CHANGES_REQUESTED),
  },

  // ── workspace collaboration (workspace shell, authenticated) ─────────────
  {
    area: 'workspace',
    name: 'channel conversation',
    slug: 'workspace-channel',
    run: channelConversationRun,
  },
  {
    area: 'workspace',
    name: 'direct conversation',
    slug: 'workspace-direct',
    run: directConversationRun,
  },
  {
    area: 'workspace',
    name: 'saved messages',
    slug: 'workspace-saved',
    run: savedMessagesRun,
  },

  // ── overlays (dialogs, drawers, popovers and panels — clicked open) ──────
  {
    area: 'overlays',
    name: 'intervention-create-drawer',
    slug: 'overlays-intervention-create-drawer',
    run: interventionCreateDrawerRun,
  },
  {
    area: 'overlays',
    name: 'intervention-edit-drawer',
    slug: 'overlays-intervention-edit-drawer',
    run: interventionEditDrawerRun,
  },
  {
    area: 'overlays',
    name: 'notification-bell',
    slug: 'overlays-notification-bell',
    run: notificationBellRun,
  },
  {
    area: 'overlays',
    name: 'assistant-panel',
    slug: 'overlays-assistant-panel',
    run: assistantPanelRun,
  },
  {
    area: 'overlays',
    name: 'channel-info-panel',
    slug: 'overlays-channel-info-panel',
    run: channelInfoPanelRun,
  },
  {
    area: 'overlays',
    name: 'quota-dialog',
    slug: 'overlays-quota-dialog',
    run: quotaDialogRun,
  },
];
//#endregion

//#region Capture harness
type Theme = 'light' | 'dark';
type ViewportName = 'desktop' | 'mobile';

const THEMES: readonly Theme[] = ['light', 'dark'];
const VIEWPORT_NAMES: readonly ViewportName[] = ['desktop', 'mobile'];
const VIEWPORTS: Readonly<Record<ViewportName, { width: number; height: number }>> = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
};

/** Cookie name `ThemeService` persists to and reads from (`THEME_COOKIE_NAME`). */
const THEME_COOKIE_NAME = 'theme-preference';

const DEFAULT_BASE_URL = 'http://localhost:4273';

/**
 * Output folder under `e2e/artifacts/ui-pass/`, overridable per capture run
 * (`UI_SHOTS_DIR=lot-3 npx playwright test …`) so each uniformization batch
 * writes its own before/after set. Defaults to the baseline `avant` set.
 */
const ARTIFACT_DIR = `e2e/artifacts/ui-pass/${process.env['UI_SHOTS_DIR'] ?? 'avant'}`;

/**
 * Sets the theme cookie before any navigation happens, so `ThemeService`
 * reads it on its very first (and only) construction and never has to
 * transition — no flash, no need to wait out an `effect()`.
 */
async function applyTheme(page: Page, baseURL: string, theme: Theme): Promise<void> {
  await page.context().addCookies([{ url: baseURL, name: THEME_COOKIE_NAME, value: theme }]);
}

/**
 * Best-effort settle: waits for the network to go quiet and for any PrimeNG
 * skeleton placeholder still on screen to disappear, both bounded and
 * non-fatal — a route that legitimately keeps a connection open (e.g. the
 * mocked Mercure stream) must not fail the capture.
 */
async function waitForSettled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);

  const skeleton = page.locator('.p-skeleton').first();
  if (await skeleton.count()) {
    await skeleton.waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => undefined);
  }
}

test.describe('UI screenshot pass — avant', () => {
  test.describe.configure({ timeout: 45_000 });

  for (const scenario of SCENARIOS) {
    for (const theme of THEMES) {
      for (const viewportName of VIEWPORT_NAMES) {
        test(`${scenario.area}: ${scenario.name} — ${theme} ${viewportName}`, async ({
          page,
          baseURL,
        }) => {
          await page.setViewportSize(VIEWPORTS[viewportName]);
          await applyTheme(page, baseURL ?? DEFAULT_BASE_URL, theme);

          await scenario.run(page);
          await waitForSettled(page);

          await page.screenshot({
            path: `${ARTIFACT_DIR}/${scenario.slug}--${theme}--${viewportName}.png`,
            fullPage: true,
          });
        });
      }
    }
  }
});
//#endregion
