import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DateTime } from 'luxon';
import { of, Subject, throwError } from 'rxjs';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT } from '@core/theme';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { MaintenanceReportService } from '@features/organization/features/maintenance-costs/data-access';
import type {
  MaintenanceEconomicReportOutput,
  MaintenanceFinancialDossierOutput,
  MaintenanceReportQuery,
} from '@features/organization/features/maintenance-costs/models';
import {
  maintenanceReportFixture,
  REPORT_CUSTOMER_ID,
  REPORT_EQUIPMENT_ID,
  REPORT_INTERVENTION_ID,
  REPORT_SITE_ID,
} from '@features/organization/features/maintenance-costs/models/report/testing/maintenance-report.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { MaintenanceFinancialDirectory } from '../../../dataviews/maintenance-financial-directory';
import { MaintenanceReportFilterForm } from '../../../forms/maintenance-report-filter-form';
import { MaintenanceReportTable } from '../../../tables/maintenance-report-table';
import { MaintenanceReportsPage } from '../maintenance-reports-page.component';

describe('MaintenanceReportsPage', () => {
  let fixture: ComponentFixture<MaintenanceReportsPage>;
  let api: { readReport: ReturnType<typeof vi.fn>; listDossiers: ReturnType<typeof vi.fn> };
  const authenticated = signal(true),
    sessionRevision = signal(1),
    grants = signal<readonly string[]>([]);
  const directoryEntry: MaintenanceFinancialDossierOutput = {
    '@id': `/api/organizations/org/maintenance-cost/dossiers/${REPORT_INTERVENTION_ID}`,
    '@type': 'MaintenanceFinancialDossier',
    id: REPORT_INTERVENTION_ID,
    number: 1,
    name: 'Entrance repair',
    type: 'repair',
    status: 'published',
    snapshotState: 'available',
    identityComplete: true,
    site: { id: REPORT_SITE_ID, name: 'Headquarters' },
    customer: { id: REPORT_CUSTOMER_ID, name: 'Internal customer' },
    equipment: [
      { id: REPORT_EQUIPMENT_ID, name: 'Entrance extinguisher', assetReference: 'EX-001' },
    ],
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setup = async (platform = 'browser'): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [MaintenanceReportsPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: MaintenanceReportService, useValue: api },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (value: string) => grants().includes(value) },
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision },
        },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: signal(false) },
        },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: {
            regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone: 'Europe/Paris' }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(MaintenanceReportsPage);
    fixture.componentRef.setInput('organizationId', 'org');
    await fixture.whenStable();
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => {
    authenticated.set(true);
    sessionRevision.set(1);
    grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    api = {
      readReport: vi
        .fn()
        .mockImplementation((organizationId: string, query: MaintenanceReportQuery) =>
          of(
            maintenanceReportFixture({
              organizationId,
              from: query.from,
              to: query.to,
              groupBy: query.groupBy,
              page: query.page,
              itemsPerPage: query.itemsPerPage,
            }),
          ),
        ),
      listDossiers: vi.fn().mockReturnValue(of({ member: [directoryEntry], totalItems: 1 })),
    };
  });
  it.each(['server', 'anonymous', 'manage-only'])(
    'renders no private report or directory in %s context',
    async (mode) => {
      if (mode === 'anonymous') authenticated.set(false);
      if (mode === 'manage-only') grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE]);
      await setup(mode === 'server' ? 'server' : 'browser');
      expect(api.readReport).not.toHaveBeenCalled();
      expect(api.listDossiers).not.toHaveBeenCalled();
      expect(root().querySelector('app-maintenance-report-filter-form')).toBeNull();
      expect(root().querySelector('[data-testid="maintenance-report-totals"]')).toBeNull();
      expect(root().textContent).toContain('authorized browser session');
    },
  );
  it('loads one browser report with a civil-date window and leaves the secondary private directory closed', async () => {
    await setup();
    expect(api.readReport).toHaveBeenCalledTimes(1);
    expect(api.listDossiers).not.toHaveBeenCalled();
    const query = api.readReport.mock.calls[0]?.[1] as MaintenanceReportQuery;
    expect(
      DateTime.fromISO(query.to, { zone: 'UTC' }).diff(
        DateTime.fromISO(query.from, { zone: 'UTC' }),
        'days',
      ).days,
    ).toBe(29);
    expect(
      root().querySelector('[data-testid="maintenance-report-current"]')?.textContent,
    ).toContain('35.000000 EUR');
    expect(
      root().querySelector('[data-testid="maintenance-report-budget"]')?.textContent,
    ).toContain('100.000000 EUR');
    expect(
      root().querySelector('[data-testid="maintenance-report-planned"]')?.textContent,
    ).toContain('24.000000 EUR');
    expect(
      root().querySelector('[data-testid="maintenance-report-procurement"]')?.textContent,
    ).toContain('independently');
  });
  it('keeps unknown, known large amounts and historical missing snapshots separate from zero', async () => {
    api.readReport.mockImplementation((organizationId: string, query: MaintenanceReportQuery) =>
      of(
        maintenanceReportFixture({
          organizationId,
          from: query.from,
          to: query.to,
          current: {
            total: null,
            knownTotal: '9007199254740993.123456',
            complete: false,
            contributionCount: 4,
            unknownCount: 1,
          },
          frozen: {
            total: null,
            knownTotal: '20.000000',
            complete: false,
            contributionCount: 2,
            unknownCount: 1,
          },
          variance: null,
          missingSnapshotCount: 1,
        }),
      ),
    );
    await setup();
    expect(
      root().querySelector('[data-testid="maintenance-report-current"]')?.textContent,
    ).toContain('Unknown');
    expect(root().textContent).toContain('9,007,199,254,740,993.123456 EUR');
    expect(
      root().querySelector('[data-testid="maintenance-report-variance"]')?.textContent,
    ).toContain('Unknown');
    expect(
      root().querySelector('[data-testid="maintenance-report-missing-snapshot"]')?.textContent,
    ).toContain('without an immutable closure snapshot');
  });
  it('loads and searches named financial directory pages only after disclosure without ordinary read grants', async () => {
    await setup();
    const disclosure = root().querySelector<HTMLButtonElement>('[hlmCollapsibleTrigger]');
    if (!disclosure) throw new Error('Directory disclosure missing');
    disclosure.click();
    await fixture.whenStable();
    expect(api.listDossiers).toHaveBeenCalledExactlyOnceWith('org', { page: 1, itemsPerPage: 30 });
    const directory = fixture.debugElement.query(By.directive(MaintenanceFinancialDirectory))
      .componentInstance as MaintenanceFinancialDirectory;
    directory.searchSubmitted.emit('Entrance');
    await fixture.whenStable();
    expect(api.listDossiers).toHaveBeenLastCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      search: 'Entrance',
    });
    directory.pageChanged.emit(2);
    await fixture.whenStable();
    expect(api.listDossiers).toHaveBeenLastCalledWith('org', {
      page: 2,
      itemsPerPage: 30,
      search: 'Entrance',
    });
    expect(api.readReport).toHaveBeenCalledTimes(1);
  });
  it('replaces target filters with one coherent named equipment context and preserves report pagination scopes', async () => {
    await setup();
    root().querySelector<HTMLButtonElement>('[hlmCollapsibleTrigger]')?.click();
    await fixture.whenStable();
    const directory = fixture.debugElement.query(By.directive(MaintenanceFinancialDirectory))
      .componentInstance as MaintenanceFinancialDirectory;
    directory.scopeSelected.emit({
      equipment: directoryEntry.equipment[0],
      site: directoryEntry.site ?? undefined,
      customer: directoryEntry.customer ?? undefined,
    });
    await fixture.whenStable();
    expect(api.readReport.mock.calls.at(-1)?.[1]).toMatchObject({
      equipmentId: REPORT_EQUIPMENT_ID,
      siteId: REPORT_SITE_ID,
      customerId: REPORT_CUSTOMER_ID,
      page: 1,
    });
    const table = fixture.debugElement.query(By.directive(MaintenanceReportTable))
      .componentInstance as MaintenanceReportTable;
    table.pageChanged.emit(2);
    await fixture.whenStable();
    expect(api.readReport.mock.calls.at(-1)?.[1]).toMatchObject({
      equipmentId: REPORT_EQUIPMENT_ID,
      siteId: REPORT_SITE_ID,
      customerId: REPORT_CUSTOMER_ID,
      page: 2,
    });
    directory.scopeSelected.emit({ site: { id: 'other-site', name: 'Branch' } });
    await fixture.whenStable();
    const replacement = api.readReport.mock.calls.at(-1)?.[1] as MaintenanceReportQuery;
    expect(replacement.siteId).toBe('other-site');
    expect(replacement.equipmentId).toBeUndefined();
    expect(replacement.customerId).toBeUndefined();
  });
  it('keeps rejected oversized queries visible and displays no stale or partial total', async () => {
    await setup();
    api.readReport.mockReturnValue(
      throwError(() => ({
        status: 422,
        title: 'Narrow the scope',
        detail: 'More than 500 dossiers.',
      })),
    );
    const filter = fixture.debugElement.query(By.directive(MaintenanceReportFilterForm))
      .componentInstance as MaintenanceReportFilterForm;
    filter.submitted.emit({
      from: '2025-01-01',
      to: '2025-12-31',
      groupBy: 'site',
      page: 1,
      itemsPerPage: 30,
    });
    await fixture.whenStable();
    expect(root().querySelector('[data-testid="maintenance-report-error"]')?.textContent).toContain(
      'No partial total',
    );
    expect(root().querySelector('[data-testid="maintenance-report-totals"]')).toBeNull();
    expect(root().querySelector('app-maintenance-report-filter-form')).not.toBeNull();
  });
  it('shows only exact named source dossiers for the selected unallocated row, without another network request', async () => {
    await setup();
    const unallocated = maintenanceReportFixture().unallocated;
    const table = fixture.debugElement.queryAll(By.directive(MaintenanceReportTable))[1]
      ?.componentInstance as MaintenanceReportTable;
    table.dossiersRequested.emit(unallocated);
    await fixture.whenStable();
    const sheet = document.querySelector('hlm-sheet-content');
    expect(sheet?.textContent).toContain('Entrance repair');
    expect(sheet?.textContent).toContain('Entrance repair');
    expect(sheet?.textContent).not.toContain('Hall repair');
    expect(sheet?.querySelector('a')?.getAttribute('href')).toContain(
      `interventionId=${REPORT_INTERVENTION_ID}`,
    );
    expect(api.listDossiers).not.toHaveBeenCalled();
    expect(api.readReport).toHaveBeenCalledTimes(1);
  });
  it('cancels a previous private report and resets scopes and drafts at account replacement', async () => {
    const old = new Subject<MaintenanceEconomicReportOutput>();
    api.readReport.mockReturnValueOnce(old);
    await setup();
    expect(old.observed).toBe(true);
    sessionRevision.set(2);
    await fixture.whenStable();
    expect(old.observed).toBe(false);
    expect(api.readReport).toHaveBeenCalledTimes(2);
    expect(
      root().querySelector('[data-testid="maintenance-report-current"]')?.textContent,
    ).toContain('35.000000 EUR');
    grants.set([]);
    await fixture.whenStable();
    expect(root().querySelector('[data-testid="maintenance-report-totals"]')).toBeNull();
  });
});
