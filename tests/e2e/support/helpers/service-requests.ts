import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Page, type Route, type TestInfo } from '@playwright/test';
import type { EquipmentOpenWorkOutput } from '@features/organization/features/equipments/models';
import type {
  ConvertServiceRequestInput,
  CreateServiceRequestInput,
  QualifyServiceRequestInput,
  ServiceRequestOutput,
} from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  hydraCollection,
} from '../fixtures/api-fixtures';
import { equipmentOutput } from '../fixtures/equipment-fixtures';
import { facilityOutput } from '../fixtures/facility-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from './appearance';

export const SERVICE_REQUEST_ID = '710e8400-e29b-41d4-a716-446655710001';
export const SERVICE_REQUEST_SITE_ID = '710e8400-e29b-41d4-a716-446655710002';
export const SERVICE_REQUEST_EQUIPMENT_ID = '710e8400-e29b-41d4-a716-446655710003';
export const SERVICE_REQUEST_INTERVENTION_ID = '710e8400-e29b-41d4-a716-446655710004';
export const SERVICE_REQUEST_TASK_ID = '710e8400-e29b-41d4-a716-446655710005';
export const SERVICE_REQUEST_SITE_NAME = 'North fire safety site';
export const SERVICE_REQUEST_EQUIPMENT_LABEL = 'FIRE-12 — Main entrance extinguisher';
export const SERVICE_REQUEST_WORK_NAME = 'Existing main entrance extinguisher repair';
const path = `/api/organizations/${E2E_ORGANIZATION_ID}/service-requests`;

export interface ServiceRequestConversionAttempt {
  readonly body: ConvertServiceRequestInput;
  readonly ifMatch: string | undefined;
}

export interface ServiceRequestMockState {
  readonly requests: Map<string, ServiceRequestOutput>;
  readonly created: CreateServiceRequestInput[];
  readonly qualifications: {
    readonly body: QualifyServiceRequestInput;
    readonly ifMatch: string | undefined;
  }[];
  readonly conversions: ServiceRequestConversionAttempt[];
  readonly targetReads: string[];
  readonly siteEquipmentQueries: string[];
  readonly work: readonly EquipmentOpenWorkOutput[];
  newWorkCreated: number;
  committedLinks: number;
  targetRetired: boolean;
}

/** Creates a retained minimal identity; no customer contacts are copied into a request. */
export function requestProjection(
  overrides: Partial<ServiceRequestOutput> = {},
): ServiceRequestOutput {
  const now = new Date().toISOString();
  return serviceRequestFixture({
    '@id': `${path}/${SERVICE_REQUEST_ID}`,
    id: SERVICE_REQUEST_ID,
    organizationId: E2E_ORGANIZATION_ID,
    equipmentId: SERVICE_REQUEST_EQUIPMENT_ID,
    siteId: SERVICE_REQUEST_SITE_ID,
    title: 'Repair the main entrance extinguisher gauge',
    description: 'The pressure gauge is damaged and the fire equipment must be repaired.',
    requestedAt: now,
    updatedAt: now,
    targetSnapshot: {
      equipment: {
        id: SERVICE_REQUEST_EQUIPMENT_ID,
        name: 'Main entrance extinguisher',
        assetCode: 'FIRE-12',
        status: 'operational',
      },
      site: { id: SERVICE_REQUEST_SITE_ID, name: SERVICE_REQUEST_SITE_NAME },
      customer: { id: '710e8400-e29b-41d4-a716-446655710006', name: 'North site operator' },
    },
    ...overrides,
  });
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: 'application/ld+json', body: JSON.stringify(body) });
}

/** Installs ApiMock's safety net before exact scoped endpoint overrides and commit/replay receipts. */
export async function installServiceRequests(
  page: Page,
  options: {
    readonly qualified?: boolean;
    readonly existingWork?: boolean;
    readonly loseConversionResponse?: boolean;
  } = {},
): Promise<ServiceRequestMockState> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: [
      ...ALL_ORGANIZATION_PERMISSIONS,
      'organization.service_requests.read',
      'organization.service_requests.create',
      'organization.service_requests.manage',
    ],
  });
  const equipment = equipmentOutput({
    id: SERVICE_REQUEST_EQUIPMENT_ID,
    '@id': `/api/equipment/${SERVICE_REQUEST_EQUIPMENT_ID}`,
    name: 'Main entrance extinguisher',
    assetCode: 'FIRE-12',
    facilityId: SERVICE_REQUEST_SITE_ID,
    facilityName: SERVICE_REQUEST_SITE_NAME,
  });
  const site = facilityOutput({
    id: SERVICE_REQUEST_SITE_ID,
    '@id': `/api/facilities/${SERVICE_REQUEST_SITE_ID}`,
    type: 'site',
    name: SERVICE_REQUEST_SITE_NAME,
    recordStatus: 'published',
  });
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipment]);
  await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, equipment);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [site]);
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, site);
  const work: EquipmentOpenWorkOutput[] = options.existingWork
    ? [
        {
          '@id': `/api/intervention-work-items/${SERVICE_REQUEST_TASK_ID}`,
          '@type': 'EquipmentOpenWork',
          interventionId: SERVICE_REQUEST_INTERVENTION_ID,
          workItemId: SERVICE_REQUEST_TASK_ID,
          name: SERVICE_REQUEST_WORK_NAME,
          number: 42,
          status: 'planned',
          action: 'repair',
          workItemStatus: 'planned',
        },
      ]
    : [];
  const state: ServiceRequestMockState = {
    requests: new Map(),
    created: [],
    qualifications: [],
    conversions: [],
    targetReads: [],
    siteEquipmentQueries: [],
    work,
    newWorkCreated: 0,
    committedLinks: 0,
    targetRetired: false,
  };
  if (options.qualified)
    state.requests.set(
      SERVICE_REQUEST_ID,
      requestProjection({
        status: 'qualified',
        revision: 2,
        qualifiedAt: new Date().toISOString(),
      }),
    );
  await page.route(
    new RegExp(
      `/api/organizations/${E2E_ORGANIZATION_ID}/facilities/${SERVICE_REQUEST_SITE_ID}/equipment(?:\\?.*)?$`,
    ),
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      expect(url.searchParams.get('includeDescendants')).toBe('true');
      state.siteEquipmentQueries.push(url.search);
      await json(route, 200, hydraCollection([equipment]));
    },
  );
  await page.route(
    new RegExp(
      `/api/organizations/${E2E_ORGANIZATION_ID}/equipment/${SERVICE_REQUEST_EQUIPMENT_ID}(?:\\?.*)?$`,
    ),
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      state.targetReads.push('equipment');
      await json(route, 200, {
        ...equipment,
        status: state.targetRetired ? 'decommissioned' : equipment.status,
      });
    },
  );
  await page.route(
    new RegExp(
      `/api/organizations/${E2E_ORGANIZATION_ID}/facilities/${SERVICE_REQUEST_SITE_ID}(?:\\?.*)?$`,
    ),
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      state.targetReads.push('site');
      await json(route, 200, { ...site, status: state.targetRetired ? 'archived' : site.status });
    },
  );
  await page.route(
    new RegExp(
      `/api/organizations/${E2E_ORGANIZATION_ID}/equipment/${SERVICE_REQUEST_EQUIPMENT_ID}/open-work(?:\\?.*)?$`,
    ),
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await json(route, 200, hydraCollection(work));
    },
  );
  let committed: ServiceRequestConversionAttempt | null = null;
  await page.route(new RegExp(`${path}(?:/[^?]*)?(?:\\?.*)?$`), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === path && request.method() === 'GET') {
      const member = [...state.requests.values()];
      await json(route, 200, hydraCollection(member));
      return;
    }
    if (url.pathname === path && request.method() === 'POST') {
      const input = request.postDataJSON() as CreateServiceRequestInput;
      state.created.push(input);
      expect(input.siteId).toBe(SERVICE_REQUEST_SITE_ID);
      expect(input.equipmentId ?? null).toBeNull();
      const projected = requestProjection({
        title: input.title,
        description: input.description,
        priority: input.priority ?? 'normal',
        equipmentId: null,
        status: 'requested',
        revision: 1,
        targetSnapshot: { ...requestProjection().targetSnapshot, equipment: null },
      });
      state.requests.set(projected.id, projected);
      await json(route, 201, projected);
      return;
    }
    if (url.pathname === `${path}/${SERVICE_REQUEST_ID}` && request.method() === 'GET') {
      await json(route, 200, state.requests.get(SERVICE_REQUEST_ID));
      return;
    }
    if (url.pathname === `${path}/${SERVICE_REQUEST_ID}/qualify` && request.method() === 'POST') {
      const current = state.requests.get(SERVICE_REQUEST_ID);
      if (!current) throw new Error('Qualification requires an existing request.');
      const input = request.postDataJSON() as QualifyServiceRequestInput;
      const ifMatch = request.headers()['if-match'];
      state.qualifications.push({ body: input, ifMatch });
      expect(ifMatch).toBe('"revision-1"');
      expect(input.equipmentId).toBe(SERVICE_REQUEST_EQUIPMENT_ID);
      const qualifiedAt = new Date().toISOString();
      const qualified = requestProjection({
        ...current,
        equipmentId: SERVICE_REQUEST_EQUIPMENT_ID,
        status: 'qualified',
        revision: 3,
        qualifiedAt,
        updatedAt: qualifiedAt,
        qualificationNote: input.note ?? null,
        targetSnapshot: {
          ...current.targetSnapshot,
          equipment: requestProjection().targetSnapshot.equipment,
        },
      });
      state.requests.set(current.id, qualified);
      await json(route, 200, qualified);
      return;
    }
    if (url.pathname === `${path}/${SERVICE_REQUEST_ID}/convert` && request.method() === 'POST') {
      const current = state.requests.get(SERVICE_REQUEST_ID);
      if (!current) throw new Error('Conversion requires an existing request.');
      const attempt = {
        body: request.postDataJSON() as ConvertServiceRequestInput,
        ifMatch: request.headers()['if-match'],
      };
      state.conversions.push(attempt);
      expect(attempt.body.clientOperationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      if (committed) {
        expect(attempt).toEqual(committed);
        await json(route, 200, current);
        return;
      }
      expect(attempt.ifMatch).toBe(`"revision-${current.revision}"`);
      if (options.existingWork)
        expect(attempt.body).toEqual({
          clientOperationId: attempt.body.clientOperationId,
          existingInterventionId: work[0].interventionId,
          existingTaskId: work[0].workItemId,
        });
      else expect(Object.keys(attempt.body)).toEqual(['clientOperationId']);
      committed = attempt;
      state.committedLinks += 1;
      if (!options.existingWork) state.newWorkCreated += 1;
      const convertedAt = new Date().toISOString();
      state.requests.set(
        current.id,
        requestProjection({
          ...current,
          status: 'converted',
          revision: current.revision + 1,
          interventionId: SERVICE_REQUEST_INTERVENTION_ID,
          taskId: SERVICE_REQUEST_TASK_ID,
          convertedAt,
          updatedAt: convertedAt,
        }),
      );
      if (options.loseConversionResponse) {
        state.targetRetired = true;
        await route.abort('failed');
        return;
      }
      await json(route, 200, state.requests.get(current.id));
      return;
    }
    await route.fallback();
  });
  return state;
}

/** Captures the actual settled editor or dossier without inspecting or starting a browser here. */
export async function captureServiceRequest(
  page: Page,
  info: TestInfo,
  name: string,
): Promise<void> {
  const run = process.env['FG_VISUAL_RUN'] ?? 'review';
  if (!/^[a-zA-Z0-9_-]+$/.test(run))
    throw new Error('FG_VISUAL_RUN must be a simple directory name.');
  const directory = join(
    'tests/e2e/artifacts/service-requests',
    run,
    info.project.name.replaceAll(' ', '-'),
  );
  await mkdir(directory, { recursive: true });
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  const editor = page.getByTestId('service-request-editor');
  if (await editor.isVisible()) await expectNoInternalOverflow(editor);
  const screenshot = join(directory, name + '.png');
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  await info.attach(name, { path: screenshot, contentType: 'image/png' });
}
