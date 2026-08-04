import { signal, type Signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionOutput,
  InterventionQueue,
  InterventionQueueKey,
  InterventionUnsyncedEntry,
} from '@features/organization/features/interventions/models';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardAlert,
  type OrganizationPermissionName,
} from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationTodayStore } from '@features/organization/state/organization-today';
import { OrganizationTodayPage } from '../organization-today.component';

type TodayPageTestApi = OrganizationTodayPage & {
  readonly subtitle: Signal<string | undefined>;
  openIntervention(intervention: InterventionOutput): void;
  createIntervention(): void;
};

interface TodayStoreMock {
  overdue: WritableSignal<InterventionQueue>;
  changesRequested: WritableSignal<InterventionQueue>;
  awaitingReview: WritableSignal<InterventionQueue>;
  upcoming: WritableSignal<InterventionQueue>;
  unsynced: WritableSignal<readonly InterventionUnsyncedEntry[]>;
  isLoading: WritableSignal<boolean>;
  hasError: WritableSignal<boolean>;
  isAllClear: WritableSignal<boolean>;
  waitingCount: WritableSignal<number>;
  loadParams: WritableSignal<string | undefined>;
  load: ReturnType<typeof vi.fn>;
}

interface DashboardStoreMock {
  alerts: WritableSignal<readonly OrganizationDashboardAlert[]>;
  isQueryLoading: WritableSignal<boolean>;
  queryHasError: WritableSignal<boolean>;
  loadParams: WritableSignal<string | undefined>;
  load: ReturnType<typeof vi.fn>;
}

function intervention(id: string): InterventionOutput {
  return { id } as unknown as InterventionOutput;
}

function emptyQueue(key: InterventionQueueKey): InterventionQueue {
  return { key, total: 0, items: [] };
}

/** Healthy defaults: nothing waiting anywhere, every permission granted. */
function createStoreMock(): TodayStoreMock {
  return {
    overdue: signal(emptyQueue('overdue')),
    changesRequested: signal(emptyQueue('changesRequested')),
    awaitingReview: signal(emptyQueue('awaitingReview')),
    upcoming: signal(emptyQueue('upcoming')),
    unsynced: signal([]),
    isLoading: signal(false),
    hasError: signal(false),
    isAllClear: signal(true),
    waitingCount: signal(0),
    loadParams: signal<string | undefined>('org-1'),
    load: vi.fn(),
  };
}

function createDashboardMock(): DashboardStoreMock {
  return {
    alerts: signal([]),
    isQueryLoading: signal(false),
    queryHasError: signal(false),
    loadParams: signal<string | undefined>('org-1'),
    load: vi.fn(),
  };
}

function createPermissionServiceMock(
  overrides: Partial<Record<OrganizationPermissionName, boolean>> = {},
): { hasPermission: ReturnType<typeof vi.fn> } {
  return {
    hasPermission: vi.fn(
      (permission: OrganizationPermissionName): boolean => overrides[permission] ?? true,
    ),
  };
}

interface SetupOptions {
  readonly store?: Partial<TodayStoreMock>;
  readonly dashboard?: Partial<DashboardStoreMock>;
  readonly permissions?: Partial<Record<OrganizationPermissionName, boolean>>;
}

function setup(options: SetupOptions = {}): {
  component: TodayPageTestApi;
  fixture: ComponentFixture<OrganizationTodayPage>;
  store: TodayStoreMock;
  dashboard: DashboardStoreMock;
  router: { navigate: ReturnType<typeof vi.fn> };
} {
  const store: TodayStoreMock = { ...createStoreMock(), ...options.store };
  const dashboard: DashboardStoreMock = { ...createDashboardMock(), ...options.dashboard };
  const permissionService = createPermissionServiceMock(options.permissions);
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    imports: [OrganizationTodayPage],
    providers: [
      { provide: OrganizationPermissionService, useValue: permissionService },
      { provide: Router, useValue: router },
    ],
  }).overrideComponent(OrganizationTodayPage, {
    set: {
      providers: [
        { provide: OrganizationTodayStore, useValue: store },
        { provide: DashboardStore, useValue: dashboard },
      ],
    },
  });

  const fixture = TestBed.createComponent(OrganizationTodayPage);
  fixture.detectChanges();

  return {
    component: fixture.componentInstance as unknown as TodayPageTestApi,
    fixture,
    store,
    dashboard,
    router,
  };
}

describe('OrganizationTodayPage', () => {
  it('renders the four work queues only when the interventions permission is granted', () => {
    const { fixture } = setup({ store: { isAllClear: signal(false) } });

    expect(fixture.nativeElement.querySelectorAll('app-organization-today-queue')).toHaveLength(4);
  });

  it('hides the work queues when the interventions permission is missing', () => {
    // The dashboard branch keeps the page out of its all-clear state so the
    // interventions gate is exercised on its own, independent of store.isAllClear.
    const { fixture } = setup({
      dashboard: { queryHasError: signal(true) },
      permissions: { [ORGANIZATION_PERMISSION.INTERVENTIONS_READ]: false },
    });

    expect(fixture.nativeElement.querySelectorAll('app-organization-today-queue')).toHaveLength(0);
  });

  it('renders the alerts strip only when the dashboard permission is granted', () => {
    const { fixture } = setup({ store: { isAllClear: signal(false) } });

    expect(fixture.nativeElement.querySelectorAll('app-organization-today-alerts')).toHaveLength(1);
  });

  it('hides the alerts strip when the dashboard permission is missing', () => {
    const { fixture } = setup({
      store: { isAllClear: signal(false) },
      permissions: { [ORGANIZATION_PERMISSION.DASHBOARD_READ]: false },
    });

    expect(fixture.nativeElement.querySelectorAll('app-organization-today-alerts')).toHaveLength(0);
  });

  it('does not render the all-clear state until everything has resolved to zero', () => {
    const { fixture } = setup({ store: { isAllClear: signal(false) } });

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('renders the all-clear state once every source has resolved to zero', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-organization-today-queue')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('app-organization-today-alerts')).toHaveLength(0);
  });

  it('opens the intervention workspace for an activated queue row', () => {
    const { component, router } = setup();

    component.openIntervention(intervention('int-42'));

    expect(router.navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'int-42',
    ]);
  });

  it('opens the interventions list with the creation drawer requested', () => {
    const { component, router } = setup();

    component.createIntervention();

    expect(router.navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions'], {
      queryParams: { create: 1 },
    });
  });

  it('has no subtitle while the queues are still loading', () => {
    const { component } = setup({ store: { isLoading: signal(true) } });

    expect(component.subtitle()).toBeUndefined();
  });

  it('states the subtitle in the singular for exactly one pending item', () => {
    const { component } = setup({
      store: { isAllClear: signal(false), waitingCount: signal(1) },
    });

    expect(component.subtitle()).toBe('One thing needs a decision from you.');
  });

  it('states the subtitle in the plural for more than one pending item', () => {
    const { component } = setup({
      store: { isAllClear: signal(false), waitingCount: signal(3) },
    });

    expect(component.subtitle()).toBe('3 things need a decision from you.');
  });
});
