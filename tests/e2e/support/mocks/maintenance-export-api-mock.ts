import { createHash } from 'node:crypto';
import { expect, type Page, type Route } from '@playwright/test';
import type {
  AdjustMaintenanceExportInput,
  ConfirmMaintenanceExportInput,
  CreateMaintenanceExportInput,
  MaintenanceExportOutput,
  MaintenanceExportReferenceOutput,
  MaintenanceExportSourceOutput,
  WriteMaintenanceExportReferenceInput,
} from '@features/organization/features/maintenance-exports/models';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  hydraCollection,
} from '../fixtures/api-fixtures';
import { facilityOutput } from '../fixtures/facility-fixtures';
import { ApiMock } from './api-mock';

export const EXPORT_INITIAL_ID = '720e8400-e29b-41d4-a716-446655820001';
export const EXPORT_ADJUSTMENT_ID = '720e8400-e29b-41d4-a716-446655820002';
export const EXPORT_PRIVATE_ID = '720e8400-e29b-41d4-a716-446655820003';
export const EXPORT_SOURCE_ID = '720e8400-e29b-41d4-a716-446655820004';
export const EXPORT_BLOCKED_SOURCE_ID = '720e8400-e29b-41d4-a716-446655820005';
export const EXPORT_SITE_ID = '720e8400-e29b-41d4-a716-446655820006';
export const EXPORT_SITE_NAME = 'Central fire-safety site';
export const EXPORT_ARCHIVED_CUSTOMER_ID = '720e8400-e29b-41d4-a716-446655820007';
export const EXPORT_ARCHIVED_CUSTOMER_NAME = 'Archived fire park operator';
export const EXPORT_SYSTEM = 'demo_erp';
const root = `/api/organizations/${E2E_ORGANIZATION_ID}`;
const archiveRoot = root + '/maintenance-exports';
const now = new Date(Date.now() - 3_600_000).toISOString();

interface RevisionAttempt<T> {
  readonly exportId: string;
  readonly body: T;
  readonly ifMatch: string | undefined;
}

export interface MaintenanceExportMockState {
  readonly archives: Map<string, MaintenanceExportOutput>;
  readonly files: Map<string, { readonly json: string; readonly csv: string }>;
  readonly createAttempts: CreateMaintenanceExportInput[];
  readonly adjustmentAttempts: RevisionAttempt<AdjustMaintenanceExportInput>[];
  readonly confirmAttempts: RevisionAttempt<ConfirmMaintenanceExportInput>[];
  readonly mappingAttempts: {
    readonly body: WriteMaintenanceExportReferenceInput;
    readonly ifMatch: string | undefined;
  }[];
  readonly downloads: string[];
  readonly customerQueries: string[];
  reference: MaintenanceExportReferenceOutput;
  committedArchives: number;
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/ld+json', body: JSON.stringify(body) });
}

function metadata(text: string, mediaType: string) {
  return {
    mediaType,
    size: Buffer.byteLength(text),
    sha256: createHash('sha256').update(text).digest('hex'),
  };
}

/** Typed scoped routes retain actual file bytes and distinguish acknowledged imports from generation. */
export async function installMaintenanceExports(
  page: Page,
  options: {
    readonly loseCreateReply?: boolean;
    readonly finance?: boolean;
    readonly readOnly?: boolean;
    readonly archivedCustomer?: boolean;
  } = {},
): Promise<MaintenanceExportMockState> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ALL_ORGANIZATION_PERMISSIONS.filter(
      (permission) =>
        (options.finance || !permission.startsWith('organization.maintenance_cost.')) &&
        (!options.readOnly ||
          ![
            'organization.maintenance_exports.manage',
            'organization.maintenance_exports.confirm',
            'organization.maintenance_cost.manage',
          ].includes(permission)),
    ),
  });
  const state: MaintenanceExportMockState = {
    archives: new Map(),
    files: new Map(),
    createAttempts: [],
    adjustmentAttempts: [],
    confirmAttempts: [],
    mappingAttempts: [],
    downloads: [],
    customerQueries: [],
    committedArchives: 0,
    reference: {
      '@id': root + '/maintenance-export-references/site/' + EXPORT_SITE_ID,
      '@type': 'MaintenanceExportReference',
      id: 'site-reference',
      resourceId: EXPORT_SITE_ID,
      resourceType: 'site',
      system: EXPORT_SYSTEM,
      reference: 'ERP-SITE-OLD',
      revision: 1,
      updatedAt: now,
    },
  };
  if (options.archivedCustomer)
    state.reference = {
      ...state.reference,
      '@id': root + '/maintenance-export-references/customer/' + EXPORT_ARCHIVED_CUSTOMER_ID,
      id: 'archived-customer-reference',
      resourceType: 'customer',
      resourceId: EXPORT_ARCHIVED_CUSTOMER_ID,
      reference: 'ERP-CUSTOMER-OLD',
    };
  const createReceipts = new Map<string, CreateMaintenanceExportInput>();
  const adjustmentReceipts = new Map<string, RevisionAttempt<AdjustMaintenanceExportInput>>();
  const sources: MaintenanceExportSourceOutput[] = [
    {
      '@id': root + '/maintenance-export-sources/' + EXPORT_SOURCE_ID,
      '@type': 'MaintenanceExportSource',
      id: EXPORT_SOURCE_ID,
      number: 41,
      name: 'Validated extinguisher gauge repair',
      type: 'corrective',
      publishedAt: now,
      publicationId: 'published-fire-repair-41',
      site: { id: EXPORT_SITE_ID, name: EXPORT_SITE_NAME },
      customer: { id: 'internal-customer', name: 'Fire park operator at publication' },
      snapshotState: 'retained',
      identityComplete: true,
      ready: true,
    },
    {
      '@id': root + '/maintenance-export-sources/' + EXPORT_BLOCKED_SOURCE_ID,
      '@type': 'MaintenanceExportSource',
      id: EXPORT_BLOCKED_SOURCE_ID,
      number: 12,
      name: 'Historical campaign missing its publication snapshot',
      type: 'control',
      publishedAt: now,
      site: null,
      customer: null,
      snapshotState: 'missing',
      identityComplete: false,
      ready: false,
      blockedReason: 'snapshot_missing',
    },
  ];
  const storeArchive = (
    id: string,
    kind: 'initial' | 'adjustment',
    includeInternalCosts: boolean,
    reason?: string,
  ): MaintenanceExportOutput => {
    const files = {
      json:
        JSON.stringify({
          schemaVersion: 1,
          exportId: id,
          kind,
          publicationId: 'published-fire-repair-41',
          references: { site: state.reference.reference },
          operation: 'repair',
          quantity: '1.000000',
          ...(reason ? { adjustmentOf: EXPORT_INITIAL_ID, reason } : {}),
          ...(includeInternalCosts ? { internalCost: '12.123456', currency: 'EUR' } : {}),
        }) + '\n',
      csv:
        'schemaVersion,exportId,publicationId,siteReference,operation,quantity\r\n' +
        `1,${id},published-fire-repair-41,${state.reference.reference},repair,1.000000\r\n`,
    };
    const archive: MaintenanceExportOutput = {
      '@id': archiveRoot + '/' + id,
      '@type': 'MaintenanceExport',
      id,
      organizationId: E2E_ORGANIZATION_ID,
      kind,
      schemaVersion: 1,
      system: EXPORT_SYSTEM,
      includeInternalCosts,
      sourceInterventionIds: [EXPORT_SOURCE_ID],
      ...(kind === 'adjustment'
        ? { originalExportId: EXPORT_INITIAL_ID, adjustmentOf: EXPORT_INITIAL_ID }
        : {}),
      createdAt: now,
      actorId: 'e2e-user-1',
      revision: 1,
      state: 'generated',
      rowCount: 1,
      files: {
        json: metadata(files.json, 'application/json'),
        csv: metadata(files.csv, 'text/csv'),
      },
      costsComplete: includeInternalCosts ? true : null,
      replayed: false,
    };
    state.files.set(id, files);
    state.archives.set(id, archive);
    return archive;
  };
  storeArchive(EXPORT_PRIVATE_ID, 'initial', true);
  await page.route(new RegExp(root + '/maintenance-export-sources(?:\\?.*)?$'), async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    expect(url.searchParams.get('itemsPerPage')).toBe('30');
    const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase();
    await json(
      route,
      hydraCollection(sources.filter((source) => source.name.toLocaleLowerCase().includes(search))),
    );
  });
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [
    facilityOutput({ id: EXPORT_SITE_ID, name: EXPORT_SITE_NAME, type: 'site' }),
  ]);
  await page.route(new RegExp(root + '/customers(?:\\?.*)?$'), async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    const archived = url.searchParams.get('archived') ?? 'false';
    state.customerQueries.push(archived);
    const customer = {
      id: EXPORT_ARCHIVED_CUSTOMER_ID,
      name: EXPORT_ARCHIVED_CUSTOMER_NAME,
      archivedAt: now,
      contacts: [{ name: 'Private billing contact' }],
    };
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const member =
      options.archivedCustomer &&
      archived === 'true' &&
      customer.name.toLowerCase().includes(search)
        ? [customer]
        : [];
    await json(route, hydraCollection(member));
  });
  await page.route(
    new RegExp(root + '/maintenance-export-references(?:/[^?]*)?(?:\\?.*)?$'),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'GET') {
        const type = url.searchParams.get('resourceType');
        await json(
          route,
          hydraCollection(!type || type === state.reference.resourceType ? [state.reference] : []),
        );
        return;
      }
      if (
        request.method() === 'PATCH' &&
        url.pathname.endsWith('/' + state.reference.resourceType + '/' + state.reference.resourceId)
      ) {
        const body = request.postDataJSON() as WriteMaintenanceExportReferenceInput;
        const attempt = { body, ifMatch: request.headers()['if-match'] };
        state.mappingAttempts.push(attempt);
        expect(attempt.ifMatch).toBe(`"revision-${state.reference.revision}"`);
        state.reference = {
          ...state.reference,
          reference: body.reference,
          revision: state.reference.revision + 1,
        };
        await json(route, state.reference);
        return;
      }
      await route.fallback();
    },
  );
  await page.route(new RegExp(archiveRoot + '(?:/[^?]*)?(?:\\?.*)?$'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const [id, action, format] = url.pathname.slice(archiveRoot.length + 1).split('/');
    if (!id && request.method() === 'GET') {
      await json(
        route,
        hydraCollection(
          [...state.archives.values()].filter(
            (archive) => !archive.includeInternalCosts || options.finance,
          ),
        ),
      );
      return;
    }
    if (!id && request.method() === 'POST') {
      const body = request.postDataJSON() as CreateMaintenanceExportInput;
      state.createAttempts.push(body);
      expect(body.interventionIds).toEqual([EXPORT_SOURCE_ID]);
      const previous = createReceipts.get(body.clientOperationId);
      if (previous) {
        expect(body).toEqual(previous);
        await json(route, { ...state.archives.get(EXPORT_INITIAL_ID), replayed: true });
        return;
      }
      createReceipts.set(body.clientOperationId, body);
      state.committedArchives++;
      const archive = storeArchive(EXPORT_INITIAL_ID, 'initial', body.includeInternalCosts);
      if (options.loseCreateReply) {
        await route.abort('failed');
        return;
      }
      await json(route, archive, 201);
      return;
    }
    const archive = id ? state.archives.get(id) : undefined;
    if (!archive) {
      await route.fallback();
      return;
    }
    if (archive.includeInternalCosts && !options.finance) {
      await json(
        route,
        { title: 'Forbidden', detail: 'Dedicated financial read permission is required.' },
        403,
      );
      return;
    }
    if (
      request.method() === 'GET' &&
      action === 'files' &&
      (format === 'json' || format === 'csv')
    ) {
      const bytes = state.files.get(archive.id)?.[format];
      if (bytes === undefined) throw new Error('The fixture must retain its actual export bytes.');
      state.downloads.push(url.pathname);
      await route.fulfill({
        status: 200,
        contentType: archive.files[format].mediaType,
        headers: {
          'content-disposition': `attachment; filename="fireguard-prestations-${archive.id}-v1.${format}"`,
        },
        body: bytes,
      });
      return;
    }
    if (request.method() === 'GET' && !action) {
      await json(route, archive);
      return;
    }
    if (request.method() === 'POST' && action === 'adjustments') {
      const attempt = {
        exportId: archive.id,
        body: request.postDataJSON() as AdjustMaintenanceExportInput,
        ifMatch: request.headers()['if-match'],
      };
      state.adjustmentAttempts.push(attempt);
      const previous = adjustmentReceipts.get(attempt.body.clientOperationId);
      if (previous) {
        expect(attempt).toEqual(previous);
        await json(route, { ...state.archives.get(EXPORT_ADJUSTMENT_ID), replayed: true });
        return;
      }
      expect(attempt.ifMatch).toBe(`"revision-${archive.revision}"`);
      adjustmentReceipts.set(attempt.body.clientOperationId, attempt);
      state.committedArchives++;
      await json(
        route,
        storeArchive(
          EXPORT_ADJUSTMENT_ID,
          'adjustment',
          archive.includeInternalCosts,
          attempt.body.reason,
        ),
        201,
      );
      return;
    }
    if (request.method() === 'POST' && action === 'confirm') {
      const attempt = {
        exportId: archive.id,
        body: request.postDataJSON() as ConfirmMaintenanceExportInput,
        ifMatch: request.headers()['if-match'],
      };
      state.confirmAttempts.push(attempt);
      expect(attempt.ifMatch).toBe(`"revision-${archive.revision}"`);
      const confirmed: MaintenanceExportOutput = {
        ...archive,
        revision: archive.revision + 1,
        state: 'import_confirmed',
        confirmation: { ...attempt.body, confirmedAt: now, actorId: 'e2e-user-1' },
      };
      state.archives.set(archive.id, confirmed);
      await json(route, confirmed);
      return;
    }
    await route.fallback();
  });
  return state;
}
