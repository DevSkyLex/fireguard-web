import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { THEME_PORT } from '@core/theme';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  MaintenanceCostCommandRepository,
  MaintenanceCostService,
} from '@features/organization/features/maintenance-costs/data-access';
import { maintenanceCostFixture } from '@features/organization/features/maintenance-costs/models/maintenance-cost/testing/maintenance-cost.fixture';
import { MaintenanceCostStore } from '@features/organization/features/maintenance-costs/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  REGIONAL_FORMATTING_PORT,
} from '@features/organization/ports';
import { unsavedChangesGuard } from '@shared/unsaved-changes';
import { MaintenanceCostSettings } from '../../../components/maintenance-cost-settings';
import { MaintenanceExpenseForm } from '../../../forms/maintenance-expense-form';
import { MaintenanceCostsPage } from '../maintenance-costs-page.component';

@Component({ template: 'Economic pilotage', changeDetection: ChangeDetectionStrategy.OnPush })
class EconomicPilotagePage {}

describe('MaintenanceCostsPage', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  it('drains exact expense and organization-rate recovery across dossier navigation before new writes', async () => {
    const newIdentity = vi.spyOn(crypto, 'randomUUID');
    const cost = maintenanceCostFixture();
    const otherCost = maintenanceCostFixture({
      id: '12345678-1234-4234-8234-123456789def',
      interventionId: '12345678-1234-4234-8234-123456789def',
    });
    const confirmedCost = maintenanceCostFixture({
      current: {
        total: '9007199254740993.123456',
        knownTotal: '9007199254740993.123456',
        complete: true,
        items: [
          {
            id: 'expense-fact',
            sourceId: 'expense-fact',
            kind: 'expense',
            currency: 'EUR',
            amount: '9007199254740993.123456',
            description: 'Original accepted fee',
            occurredAt: '2025-01-01T00:00:00Z',
          },
        ],
      },
    });
    const transmitted = new Subject<ReturnType<typeof maintenanceCostFixture>>();
    const transmittedRate = new Subject<{
      id: string;
      memberId: string;
      currency: string;
      hourlyAmount: string;
      effectiveFrom: string;
      replayed: boolean;
    }>();
    const rate = {
      id: 'rate-fact',
      memberId: 'member',
      currency: 'EUR',
      hourlyAmount: '9007199254740993.123456',
      effectiveFrom: '2025-01-01',
      replayed: true,
    };
    const entries = new Map<string, unknown>([['metadata:ownerUserId', 'user-a']]);
    const api = {
      readCost: vi
        .fn()
        .mockImplementation((_organizationId, interventionId) =>
          of(interventionId === otherCost.interventionId ? otherCost : cost),
        ),
      writePlanning: vi.fn(),
      readCurrency: vi
        .fn()
        .mockReturnValue(of({ organizationId: 'org', currency: 'EUR', locked: true })),
      writeCurrency: vi.fn(),
      listRates: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      createRate: vi.fn().mockReturnValueOnce(transmittedRate).mockReturnValue(of(rate)),
      createExpense: vi.fn().mockReturnValueOnce(transmitted).mockReturnValue(of(confirmedCost)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            {
              path: 'organizations/:organizationId/maintenance-costs/reports',
              component: EconomicPilotagePage,
            },
            {
              path: 'organizations/:organizationId/maintenance-costs',
              component: MaintenanceCostsPage,
              canDeactivate: [unsavedChangesGuard],
            },
          ],
          withComponentInputBinding(),
        ),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MaintenanceCostService, useValue: api },
        {
          provide: OrganizationMemberService,
          useValue: { listAll: vi.fn().mockReturnValue(of([])) },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: (grant: string) =>
              [
                ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ,
                ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
              ].includes(grant as typeof ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ),
          },
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: signal(true), sessionRevision: signal(1) },
        },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: {
            profile: signal({ userId: 'user-a', organizationId: 'org', isActive: true }),
          },
        },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone: 'UTC' }) },
        },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
      ],
    });
    const repository = TestBed.inject(MaintenanceCostCommandRepository);
    vi.spyOn(repository, 'get').mockImplementation(
      async <T>(store: string, key: string): Promise<T | null> =>
        (entries.get(`${store}:${key}`) as T | undefined) ?? null,
    );
    const getAll = vi
      .spyOn(repository, 'getAll')
      .mockImplementation(async <T>(store: string): Promise<readonly T[]> =>
        [...entries.entries()]
          .filter(([key]) => key.startsWith(`${store}:`))
          .map(([, value]) => structuredClone(value) as T),
      );
    vi.spyOn(repository, 'put').mockImplementation(async (store, key, value, current) => {
      if (current && !current()) throw new Error('Ownership changed');
      entries.set(`${store}:${key}`, structuredClone(value));
    });
    vi.spyOn(repository, 'remove').mockImplementation(async (store, key, current) => {
      if (current && !current()) throw new Error('Ownership changed');
      entries.delete(`${store}:${key}`);
    });
    vi.spyOn(repository, 'clearAll').mockImplementation(async () => {
      entries.clear();
    });
    const url = `/organizations/org/maintenance-costs?interventionId=${cost.interventionId}`;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, MaintenanceCostsPage);
    await harness.fixture.whenStable();
    const oldStore = harness.routeDebugElement?.injector.get(MaintenanceCostStore);
    if (!oldStore) throw new Error('Cost store missing');
    await vi.waitFor(() => expect(oldStore.journalReady()).toBe(true));
    let destroyed = false;
    harness.routeDebugElement?.injector.get(DestroyRef).onDestroy(() => {
      destroyed = true;
    });
    const form = harness.routeDebugElement?.query(By.directive(MaintenanceExpenseForm))
      .componentInstance as MaintenanceExpenseForm;
    form.submitted.emit({
      amount: '9007199254740993.123456',
      description: 'Original accepted fee',
      incurredAt: '2025-01-01T00:00:00Z',
      adjustmentOf: null,
      workItemId: null,
    });
    await harness.fixture.whenStable();
    await vi.waitFor(() => expect(api.createExpense).toHaveBeenCalledTimes(1));
    expect(oldStore.writePending()).toBe(true);
    const pendingLink = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(
      'a[href$="/maintenance-costs/reports"]',
    );
    if (!pendingLink) throw new Error('Economic pilotage link missing');
    pendingLink.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(url);
    expect(destroyed).toBe(false);
    expect(transmitted.observed).toBe(true);
    transmitted.error({ type: 'about:blank', status: 0, title: 'Network', detail: 'Lost reply' });
    await vi.waitFor(() => expect(oldStore.uncertainWrite()).toBe(true));
    expect(oldStore.uncertainWrite()).toBe(true);
    const original = structuredClone(api.createExpense.mock.calls[0]?.[2]);
    expect(original.clientId).toMatch(/^[\da-f-]{36}$/);
    const pilotageLink = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(
      'a[href$="/maintenance-costs/reports"]',
    );
    if (!pilotageLink) throw new Error('Economic pilotage link missing');
    pilotageLink.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/organizations/org/maintenance-costs/reports');
    expect(destroyed).toBe(true);
    const otherUrl = `/organizations/org/maintenance-costs?interventionId=${otherCost.interventionId}`;
    await harness.navigateByUrl(otherUrl, MaintenanceCostsPage);
    await harness.fixture.whenStable();
    const otherStore = harness.routeDebugElement?.injector.get(MaintenanceCostStore);
    await vi.waitFor(() => expect(otherStore?.journalReady()).toBe(true));
    expect(otherStore?.command()).toBeNull();
    expect(otherStore?.costCallState().data?.interventionId).toBe(otherCost.interventionId);
    const settingsTab = harness.routeNativeElement?.querySelector<HTMLButtonElement>(
      '[hlmTabsTrigger="settings"]',
    );
    if (!settingsTab) throw new Error('Settings tab missing');
    settingsTab.click();
    await harness.fixture.whenStable();
    const settings = harness.routeDebugElement?.query(By.directive(MaintenanceCostSettings))
      .componentInstance as MaintenanceCostSettings;
    settings.rateSubmitted.emit({
      memberId: rate.memberId,
      hourlyAmount: rate.hourlyAmount,
      effectiveFrom: rate.effectiveFrom,
    });
    await vi.waitFor(() => expect(api.createRate).toHaveBeenCalledTimes(1));
    transmittedRate.error({
      type: 'about:blank',
      status: 0,
      title: 'Network',
      detail: 'Lost reply',
    });
    await vi.waitFor(() => expect(otherStore?.uncertainWrite()).toBe(true));
    const originalRate = structuredClone(api.createRate.mock.calls[0]?.[1]);
    expect(originalRate.clientId).toMatch(/^[\da-f-]{36}$/);
    expect(originalRate.clientId).not.toBe(original.clientId);
    await harness.navigateByUrl(
      '/organizations/org/maintenance-costs/reports',
      EconomicPilotagePage,
    );
    expect([...entries.keys()].filter((key) => key.startsWith('commands:'))).toHaveLength(2);
    await harness.navigateByUrl(url, MaintenanceCostsPage);
    await harness.fixture.whenStable();
    const restored = harness.routeDebugElement?.injector.get(MaintenanceCostStore);
    await vi.waitFor(() => expect(restored?.journalReady()).toBe(true));
    expect(restored).not.toBe(oldStore);
    expect(restored?.command()).toMatchObject({ kind: 'expense', input: original });
    expect(restored?.uncertainWrite()).toBe(true);
    const currentForm = harness.routeDebugElement?.query(By.directive(MaintenanceExpenseForm))
      .componentInstance as MaintenanceExpenseForm;
    currentForm.submitted.emit({
      amount: '1',
      description: 'Duplicate attempt',
      incurredAt: '2025-01-01T00:00:00Z',
      adjustmentOf: null,
      workItemId: null,
    });
    expect(api.createExpense).toHaveBeenCalledTimes(1);
    const retry = [
      ...(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? []),
    ].find((button) => button.textContent?.includes('Retry the original declaration'));
    if (!retry) throw new Error('Exact retry action missing');
    let releaseRecovery!: () => void;
    getAll.mockImplementationOnce(async <T>(store: string): Promise<readonly T[]> => {
      await new Promise<void>((resolve) => {
        releaseRecovery = resolve;
      });
      return [...entries.entries()]
        .filter(([key]) => key.startsWith(`${store}:`))
        .map(([, value]) => structuredClone(value) as T);
    });
    retry.click();
    await vi.waitFor(() => expect(restored?.writeCallState().status).toBe('success'));
    expect(restored?.journalCallState().status).toBe('pending');
    expect(restored?.journalReady()).toBe(false);
    expect(restored?.command()).toBeNull();
    expect(restored?.costCallState().data?.current).toEqual(confirmedCost.current);
    expect(api.createExpense).toHaveBeenCalledTimes(2);
    expect(api.createExpense.mock.calls[1]?.[2]).toEqual(original);
    await vi.waitFor(() => expect(releaseRecovery).toBeTypeOf('function'));
    expect([...entries.keys()].filter((key) => key.startsWith('commands:'))).toEqual([
      `commands:rate:${originalRate.clientId}`,
    ]);
    currentForm.submitted.emit({
      amount: '1',
      description: 'Premature expense',
      incurredAt: '2025-01-01T00:00:00Z',
    });
    const restoredSettings = harness.routeDebugElement?.query(By.directive(MaintenanceCostSettings))
      .componentInstance as MaintenanceCostSettings;
    restoredSettings.rateSubmitted.emit({ ...originalRate, hourlyAmount: '1' });
    expect(api.createExpense).toHaveBeenCalledTimes(2);
    expect(api.createRate).toHaveBeenCalledTimes(1);
    expect(newIdentity).toHaveBeenCalledTimes(2);
    releaseRecovery();
    await vi.waitFor(() => expect(restored?.command()?.kind).toBe('rate'));
    await harness.fixture.whenStable();
    expect(restored?.command()).toMatchObject({ kind: 'rate', input: originalRate });
    expect(restored?.uncertainWrite()).toBe(true);
    expect(restored?.costCallState().data?.current).toEqual(confirmedCost.current);
    restoredSettings.rateSubmitted.emit({ ...originalRate, hourlyAmount: '1' });
    expect(api.createRate).toHaveBeenCalledTimes(1);
    expect(newIdentity).toHaveBeenCalledTimes(2);
    const rateRetry = [
      ...(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? []),
    ].find((button) => button.textContent?.includes('Retry the original declaration'));
    if (!rateRetry) throw new Error('Original rate retry action missing');
    rateRetry.click();
    await vi.waitFor(() => expect(restored?.command()).toBeNull());
    await vi.waitFor(() => expect(restored?.journalReady()).toBe(true));
    await harness.fixture.whenStable();
    expect(api.createRate).toHaveBeenCalledTimes(2);
    expect(api.createRate.mock.calls[1]?.[1]).toEqual(originalRate);
    expect(newIdentity).toHaveBeenCalledTimes(2);
    expect(restored?.command()).toBeNull();
    expect(restored?.uncertainWrite()).toBe(false);
    expect([...entries.keys()].filter((key) => key.startsWith('commands:'))).toEqual([]);
  });
});
