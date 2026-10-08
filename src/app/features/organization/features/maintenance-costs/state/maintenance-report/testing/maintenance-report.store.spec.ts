import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { MaintenanceReportService } from '@features/organization/features/maintenance-costs/data-access';
import type {
  MaintenanceEconomicReportOutput,
  MaintenanceFinancialDossierOutput,
  MaintenanceReportQuery,
} from '@features/organization/features/maintenance-costs/models';
import { maintenanceReportFixture } from '@features/organization/features/maintenance-costs/models/report/testing/maintenance-report.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  MaintenanceReportStore,
  type MaintenanceReportStoreType,
} from '../maintenance-report.store';

describe('MaintenanceReportStore', () => {
  let store: MaintenanceReportStoreType;
  let api: { readReport: ReturnType<typeof vi.fn>; listDossiers: ReturnType<typeof vi.fn> };
  const revision = signal(1),
    authenticated = signal(true),
    grants = signal<readonly string[]>([]);
  const scope = { organizationId: 'org', sessionRevision: 1 };
  const query: MaintenanceReportQuery = {
    from: '2025-01-01',
    to: '2025-01-31',
    groupBy: 'equipment',
    page: 1,
    itemsPerPage: 30,
  };
  const empty: HydraCollection<MaintenanceFinancialDossierOutput> = {
    '@id': '/api/organizations/org/maintenance-cost/dossiers',
    '@type': 'Collection',
    member: [],
    totalItems: 0,
  };
  const setup = (platform = 'browser'): void => {
    TestBed.configureTestingModule({
      providers: [
        MaintenanceReportStore,
        { provide: PLATFORM_ID, useValue: platform },
        { provide: MaintenanceReportService, useValue: api },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (value: string) => grants().includes(value) },
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
      ],
    });
    store = TestBed.inject(MaintenanceReportStore);
    store.setScope(scope);
  };
  beforeEach(() => {
    revision.set(1);
    authenticated.set(true);
    grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    api = {
      readReport: vi.fn().mockReturnValue(of(maintenanceReportFixture())),
      listDossiers: vi.fn().mockReturnValue(of(empty)),
    };
  });
  it.each(['server', 'anonymous', 'manage-only'])(
    'never reads or retains private financial reports in %s context',
    (mode) => {
      if (mode === 'anonymous') authenticated.set(false);
      if (mode === 'manage-only') grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE]);
      setup(mode === 'server' ? 'server' : 'browser');
      store.readReport({ scope, query });
      store.readDirectory({ scope, query: { page: 1, itemsPerPage: 30 } });
      expect(api.readReport).not.toHaveBeenCalled();
      expect(api.listDossiers).not.toHaveBeenCalled();
      expect(store.reportCallState().data).toBeNull();
      expect(store.dossierEntities()).toEqual([]);
    },
  );
  it('uses financial-read permission alone for exact totals and independent named sources', () => {
    setup();
    store.readReport({ scope, query });
    expect(store.reportCallState().data?.current.total).toBe('35.000000');
    expect(store.reportCallState().data?.rows.map((row) => row.current.total)).toEqual([
      '10.000000',
      '20.000000',
    ]);
    expect(store.reportCallState().data?.unallocated.current.total).toBe('5.000000');
    store.readDirectory({ scope, query: { page: 2, itemsPerPage: 30, search: 'Entrance' } });
    expect(api.listDossiers).toHaveBeenCalledExactlyOnceWith('org', {
      page: 2,
      itemsPerPage: 30,
      search: 'Entrance',
    });
    expect(store.reportCallState().data?.current.total).toBe('35.000000');
  });
  it('does not derive a full-filter total from a sparse allocation page', () => {
    setup();
    api.readReport.mockReturnValue(
      of(maintenanceReportFixture({ page: 2, totalItems: 61, rows: [] })),
    );
    store.readReport({ scope, query: { ...query, page: 2 } });
    expect(store.reportCallState().data?.totalItems).toBe(61);
    expect(store.reportCallState().data?.current.total).toBe('35.000000');
    expect(store.reportCallState().data?.rows).toEqual([]);
  });
  it('clears old totals while a changed scope is pending and exposes rejection without partial results', () => {
    setup();
    store.readReport({ scope, query });
    const pending = new Subject<MaintenanceEconomicReportOutput>();
    api.readReport.mockReturnValue(pending);
    store.readReport({ scope, query: { ...query, equipmentId: 'other' } });
    expect(store.reportCallState().status).toBe('pending');
    expect(store.reportCallState().data).toBeNull();
    pending.error({
      type: 'about:blank',
      status: 422,
      title: 'Narrow the scope',
      detail: 'Too many dossiers.',
    });
    expect(store.reportCallState().status).toBe('error');
    expect(store.reportCallState().error?.code).toBe(422);
    expect(store.reportCallState().data).toBeNull();
    expect(store.reportQuery()?.equipmentId).toBe('other');
  });
  it.each([
    { organizationId: 'foreign' },
    { from: '2024-01-01' },
    { to: '2024-01-31' },
    { groupBy: 'customer' as const },
  ])(
    'rejects a response whose declared organization or date scope is inconsistent: %s',
    (override) => {
      setup();
      api.readReport.mockReturnValue(of(maintenanceReportFixture(override)));
      store.readReport({ scope, query });
      expect(store.reportCallState().data).toBeNull();
      expect(store.reportCallState().status).toBe('error');
    },
  );
  it('cancels superseded report and directory reads before another organization can render their late replies', () => {
    setup();
    const report = new Subject<MaintenanceEconomicReportOutput>(),
      directory = new Subject<HydraCollection<MaintenanceFinancialDossierOutput>>();
    api.readReport.mockReturnValue(report);
    api.listDossiers.mockReturnValue(directory);
    store.readReport({ scope, query });
    store.readDirectory({ scope, query: { page: 1, itemsPerPage: 30 } });
    expect(report.observed).toBe(true);
    expect(directory.observed).toBe(true);
    store.setScope({ organizationId: 'other', sessionRevision: 1 });
    expect(report.observed).toBe(false);
    expect(directory.observed).toBe(false);
    report.next(maintenanceReportFixture());
    directory.next(empty);
    expect(store.reportCallState().data).toBeNull();
    expect(store.directoryQuery()).toBeNull();
  });
  it('invalidates private totals and names after account replacement or permission revocation', () => {
    setup();
    store.readReport({ scope, query });
    TestBed.tick();
    revision.set(2);
    TestBed.tick();
    expect(store.scope()).toBeNull();
    expect(store.reportCallState().data).toBeNull();
    store.setScope({ organizationId: 'org', sessionRevision: 2 });
    store.readReport({ scope: { organizationId: 'org', sessionRevision: 2 }, query });
    grants.set([]);
    TestBed.tick();
    expect(store.scope()).toBeNull();
    expect(store.dossierEntities()).toEqual([]);
  });
  it('normalizes independent directory failures without hiding a valid report', () => {
    setup();
    store.readReport({ scope, query });
    api.listDossiers.mockReturnValue(
      throwError(() => ({
        type: 'about:blank',
        status: 503,
        title: 'Unavailable',
        detail: 'Try again.',
      })),
    );
    store.readDirectory({ scope, query: { page: 1, itemsPerPage: 30 } });
    expect(store.directoryCallState().error?.code).toBe(503);
    expect(store.reportCallState().status).toBe('success');
  });
});
