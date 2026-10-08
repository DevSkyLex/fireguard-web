import { computed, PLATFORM_ID, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { THEME_PORT } from '@core/theme';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  MaintenanceCostService,
  MaintenanceCostCommandRepository,
} from '@features/organization/features/maintenance-costs/data-access';
import type { MaintenanceCostOutput } from '@features/organization/features/maintenance-costs/models';
import { maintenanceCostFixture } from '@features/organization/features/maintenance-costs/models/maintenance-cost/testing/maintenance-cost.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  REGIONAL_FORMATTING_PORT,
} from '@features/organization/ports';
import { MaintenanceExpenseForm } from '../../../forms/maintenance-expense-form';
import { MaintenancePlanningForm } from '../../../forms/maintenance-planning-form';
import { MaintenanceCostsPage } from '../maintenance-costs-page.component';

describe('MaintenanceCostsPage', () => {
  let fixture: ComponentFixture<MaintenanceCostsPage>;
  let service: {
    readCost: ReturnType<typeof vi.fn>;
    writePlanning: ReturnType<typeof vi.fn>;
    createExpense: ReturnType<typeof vi.fn>;
    readCurrency: ReturnType<typeof vi.fn>;
    writeCurrency: ReturnType<typeof vi.fn>;
    listRates: ReturnType<typeof vi.fn>;
    createRate: ReturnType<typeof vi.fn>;
  };
  let members: { listAll: ReturnType<typeof vi.fn> };
  const authenticated = signal(true),
    actor = signal('user-a'),
    sessionRevision = signal(1),
    online = signal(true),
    grants = signal<readonly string[]>([]);
  const cost = maintenanceCostFixture();
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setup = async (platform = 'browser'): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [MaintenanceCostsPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: {
            profile: computed(() => ({ userId: actor(), organizationId: 'org', isActive: true })),
          },
        },
        {
          provide: MaintenanceCostCommandRepository,
          useValue: {
            captureOwner: vi.fn().mockImplementation(() => actor()),
            readPending: vi.fn().mockResolvedValue(null),
            retain: vi.fn().mockResolvedValue(undefined),
            acknowledge: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: MaintenanceCostService, useValue: service },
        { provide: OrganizationMemberService, useValue: members },
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
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone: 'UTC' }) },
        },
        { provide: ConnectivityService, useValue: { isOnline: online } },
      ],
    });
    fixture = TestBed.createComponent(MaintenanceCostsPage);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('interventionId', cost.interventionId);
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
    actor.set('user-a');
    authenticated.set(true);
    sessionRevision.set(1);
    online.set(true);
    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
    ]);
    service = {
      readCost: vi.fn().mockReturnValue(of(cost)),
      writePlanning: vi.fn().mockReturnValue(of(cost)),
      createExpense: vi.fn().mockReturnValue(of(cost)),
      readCurrency: vi
        .fn()
        .mockReturnValue(of({ organizationId: 'org', currency: 'EUR', locked: false })),
      writeCurrency: vi
        .fn()
        .mockReturnValue(of({ organizationId: 'org', currency: 'EUR', locked: false })),
      listRates: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      createRate: vi.fn(),
    };
    members = { listAll: vi.fn().mockReturnValue(of([])) };
  });
  it.each(['server', 'no-read', 'anonymous'])(
    'performs zero private API calls and renders no financial facts in %s',
    async (mode: string) => {
      if (mode === 'no-read') grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE]);
      if (mode === 'anonymous') authenticated.set(false);
      await setup(mode === 'server' ? 'server' : 'browser');
      expect(service.readCost).not.toHaveBeenCalled();
      expect(service.readCurrency).not.toHaveBeenCalled();
      expect(service.listRates).not.toHaveBeenCalled();
      expect(members.listAll).not.toHaveBeenCalled();
      expect(root().querySelector('app-maintenance-planning-form')).toBeNull();
      expect(root().textContent).toContain('authorized browser session');
    },
  );
  it('renders a private read-only dossier, exact unknowns and its separate immutable snapshot', async () => {
    grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    service.readCost.mockReturnValue(
      of(
        maintenanceCostFixture({
          plannedBudget: '0.000000',
          current: {
            total: null,
            knownTotal: '9007199254740993.123456',
            complete: false,
            items: [],
          },
          frozen: {
            version: 1,
            capturedAt: '2025-01-01T00:00:00Z',
            publicationId: 'publication',
            interventionRevision: 8,
            currency: 'EUR',
            plannedBudget: '20.000000',
            estimatedMinutes: 60,
            resources: [],
            total: '10.000000',
            knownTotal: '10.000000',
            complete: true,
            items: [],
          },
        }),
      ),
    );
    await setup();
    expect(service.readCost).toHaveBeenCalledExactlyOnceWith('org', cost.interventionId);
    expect(
      root().querySelector('[data-testid="maintenance-current-total"]')?.textContent,
    ).toContain('Unknown');
    expect(root().querySelector('[data-testid="maintenance-frozen-total"]')?.textContent).toContain(
      '10.000000 EUR',
    );
    expect(root().textContent).toContain('9,007,199,254,740,993.123456 EUR');
    expect(root().querySelector('app-maintenance-expense-form')).toBeNull();
    expect(root().querySelector('app-maintenance-planning-form')).toBeNull();
    expect(root().textContent).not.toContain('Browse interventions');
  });
  it('submits the displayed independent revision zero and preserves exact forecast text', async () => {
    await setup();
    const form = fixture.debugElement.query(By.directive(MaintenancePlanningForm))
      .componentInstance as MaintenancePlanningForm;
    const input = {
      plannedBudget: '9007199254740993.123456',
      estimatedMinutes: null,
      resources: [],
    };
    form.submitted.emit({ revision: 0, input });
    await fixture.whenStable();
    expect(service.writePlanning).toHaveBeenCalledExactlyOnceWith(
      'org',
      cost.interventionId,
      input,
      0,
    );
  });
  it('does not read currency/rates until their tab is opened and does not read members without their grant', async () => {
    await setup();
    expect(service.readCurrency).not.toHaveBeenCalled();
    expect(service.listRates).not.toHaveBeenCalled();
    const tab = root().querySelector<HTMLButtonElement>('[hlmTabsTrigger="settings"]');
    if (!tab) throw new Error('Settings tab missing');
    tab.click();
    await fixture.whenStable();
    expect(service.readCurrency).toHaveBeenCalledExactlyOnceWith('org');
    expect(service.listRates).toHaveBeenCalledExactlyOnceWith('org', { page: 1, itemsPerPage: 30 });
    expect(members.listAll).not.toHaveBeenCalled();
    grants.set([...grants(), ORGANIZATION_PERMISSION.MEMBERS_READ]);
    await fixture.whenStable();
    expect(members.listAll).toHaveBeenCalledWith('org');
  });
  it('keeps an expense replay key stable after a lost reply and disables a second declaration', async () => {
    service.createExpense
      .mockReturnValueOnce(
        throwError(() => ({
          type: 'about:blank',
          status: 0,
          title: 'Network',
          detail: 'Confirmation lost',
        })),
      )
      .mockReturnValue(of(cost));
    await setup();
    const form = fixture.debugElement.query(By.directive(MaintenanceExpenseForm))
      .componentInstance as MaintenanceExpenseForm;
    const input = {
      amount: '12.000001',
      description: 'Original repair fee',
      incurredAt: '2025-01-01T00:00:00Z',
      adjustmentOf: null,
      workItemId: null,
    };
    form.submitted.emit(input);
    await fixture.whenStable();
    expect(service.createExpense).toHaveBeenCalledTimes(1);
    expect(root().textContent).toContain('original declaration is retained');
    form.submitted.emit({ ...input, amount: '99' });
    expect(service.createExpense).toHaveBeenCalledTimes(1);
    [...root().querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Retry the original'))
      ?.click();
    await fixture.whenStable();
    expect(service.createExpense).toHaveBeenCalledTimes(2);
    expect(service.createExpense.mock.calls[1]?.[2]).toEqual(
      service.createExpense.mock.calls[0]?.[2],
    );
    expect(service.createExpense.mock.calls[0]?.[2].clientId).toMatch(/^[\da-f-]{36}$/);
  });
  it('clears private draft text on a same-organization session replacement', async () => {
    await setup();
    const budget = root().querySelector<HTMLInputElement>('#maintenance-budget');
    if (!budget) throw new Error('Budget missing');
    budget.value = '123.000001';
    budget.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    sessionRevision.set(2);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-budget')?.value).toBe('');
    expect(service.readCost).toHaveBeenCalledTimes(2);
  });
  it('cancels an obsolete dossier read when route intervention context changes', async () => {
    const old = new Subject<MaintenanceCostOutput>();
    service.readCost.mockReturnValueOnce(old);
    await setup();
    const other = '12345678-1234-4234-8234-123456789abd';
    service.readCost.mockReturnValue(of({ ...cost, id: other, interventionId: other }));
    fixture.componentRef.setInput('interventionId', other);
    await fixture.whenStable();
    expect(old.observed).toBe(false);
    expect(service.readCost).toHaveBeenLastCalledWith('org', other);
  });

  it('clears private draft text on a same-organization actor replacement with unchanged grants', async () => {
    await setup();
    const budget = root().querySelector<HTMLInputElement>('#maintenance-budget');
    if (!budget) throw new Error('Budget missing');
    budget.value = '123.000001';
    budget.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    actor.set('user-b');
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#maintenance-budget')?.value).toBe('');
    expect(service.readCost).toHaveBeenCalledTimes(2);
  });

  it('allows session-loss navigation while an old accepted expense is still pending', async () => {
    const accepted = new Subject<MaintenanceCostOutput>();
    service.createExpense.mockReturnValueOnce(accepted);
    await setup();
    const form = fixture.debugElement.query(By.directive(MaintenanceExpenseForm))
      .componentInstance as MaintenanceExpenseForm;
    form.submitted.emit({
      amount: '1',
      description: 'Original',
      incurredAt: '2025-01-01T00:00:00Z',
      adjustmentOf: null,
      workItemId: null,
    });
    await vi.waitFor(() => expect(service.createExpense).toHaveBeenCalledTimes(1));
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    authenticated.set(false);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    expect(await fixture.componentInstance.confirmDeactivation()).toBe(true);
  });
  it('prevents offline financial writes while retaining the browser-visible dossier', async () => {
    online.set(false);
    await setup();
    const form = fixture.debugElement.query(By.directive(MaintenancePlanningForm))
      .componentInstance as MaintenancePlanningForm;
    form.submitted.emit({
      revision: 0,
      input: { plannedBudget: '1', estimatedMinutes: null, resources: [] },
    });
    expect(service.writePlanning).not.toHaveBeenCalled();
    expect(root().querySelector<HTMLInputElement>('#maintenance-budget')?.disabled).toBe(true);
  });
});
