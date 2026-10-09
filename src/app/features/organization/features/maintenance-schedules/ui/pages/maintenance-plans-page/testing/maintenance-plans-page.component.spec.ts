import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  MaintenanceEngineOutput,
  MaintenancePlanOutput,
  MaintenancePlanPreviewOutput,
  MaintenancePlanGenerationOutput,
  CreateMaintenancePlanInput,
} from '@features/organization/features/maintenance-schedules/models';
import {
  MaintenancePlansStore,
  maintenancePlansStoreEvents,
} from '@features/organization/features/maintenance-schedules/state';
import { MaintenancePlanList } from '@features/organization/features/maintenance-schedules/ui/components/maintenance-plan-list';
import { MaintenancePlanForm } from '@features/organization/features/maintenance-schedules/ui/forms/maintenance-plan-form';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox } from '@shared/collection-toolbar';
import { HlmAlertDialog } from '@shared/ui/alert-dialog';
import { MaintenancePlansPage } from '../maintenance-plans-page.component';

const button = (root: ParentNode, text: string): HTMLButtonElement => {
  const candidate = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.trim() === text,
  );
  expect(candidate, `Expected the ${text} button`).toBeDefined();
  if (!candidate) throw new Error(`Missing ${text} button`);
  return candidate;
};

const planForm = (fixture: ComponentFixture<MaintenancePlansPage>): MaintenancePlanForm =>
  fixture.debugElement.query(By.directive(MaintenancePlanForm))
    .componentInstance as MaintenancePlanForm;

describe('MaintenancePlansPage', () => {
  let load: ReturnType<typeof vi.fn>;
  let loadEngine: ReturnType<typeof vi.fn>;
  let loadEquipment: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let selectedPlan: WritableSignal<MaintenancePlanOutput | null>;
  let previewState: WritableSignal<CallState<MaintenancePlanPreviewOutput>>;
  let planEntities: WritableSignal<readonly MaintenancePlanOutput[]>;
  let engineState: WritableSignal<CallState<MaintenanceEngineOutput>>;
  let migrationState: WritableSignal<CallState<MaintenanceEngineOutput>>;
  let createState: WritableSignal<CallState<MaintenancePlanOutput>>;
  let updateState: WritableSignal<CallState<MaintenancePlanOutput>>;
  let commandPending: WritableSignal<boolean>;
  let permissionGrants: WritableSignal<readonly string[]>;
  let create: ReturnType<typeof vi.fn>;
  let preview: ReturnType<typeof vi.fn>;
  let generate: ReturnType<typeof vi.fn>;
  let migrate: ReturnType<typeof vi.fn>;
  let resetCreate: ReturnType<typeof vi.fn>;
  let preparedEvents: Subject<ReturnType<typeof maintenancePlansStoreEvents.planPrepared>>;
  let changedEvents: Subject<ReturnType<typeof maintenancePlansStoreEvents.planChanged>>;
  const organizationId = 'b113ff1a-18b5-4dc2-a8d5-c9e2d812076a';
  const planId = '9426e822-f8fb-4909-8463-caf4a1d9152e';
  const equipmentId = 'f0b97d51-f7e5-48d1-9797-941b6d2bc11c';
  const operation = (overrides: Partial<MaintenancePlanOutput> = {}): MaintenancePlanOutput => ({
    '@id': `/api/organizations/${organizationId}/maintenance/plans/${planId}`,
    '@type': 'MaintenancePlan',
    id: planId,
    organizationId,
    equipmentId,
    equipmentType: 'fire_extinguisher',
    name: 'Monthly equipment maintenance',
    operationKind: 'maintenance',
    interval: 'P1M',
    cadenceMode: 'fixed',
    calendarTimezone: 'Europe/Paris',
    anchorAt: '2027-01-31T00:00:00+01:00',
    nextDueAt: '2027-02-28T00:00:00+01:00',
    active: false,
    openOccurrence: null,
    ...overrides,
  });
  const render = async (): Promise<ComponentFixture<MaintenancePlansPage>> => {
    const fixture = TestBed.createComponent(MaintenancePlansPage);
    fixture.componentRef.setInput('organizationId', organizationId);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };
  const openEditor = (
    fixture: ComponentFixture<MaintenancePlansPage>,
    plan: MaintenancePlanOutput,
  ): void => {
    planEntities.set([plan]);
    fixture.detectChanges();
    button(fixture.nativeElement as HTMLElement, 'Configure').click();
    fixture.detectChanges();
  };
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        public observe(): void {}
        public unobserve(): void {}
        public disconnect(): void {}
      },
    );
    load = vi.fn();
    loadEngine = vi.fn();
    loadEquipment = vi.fn();
    update = vi.fn();
    create = vi.fn();
    preview = vi.fn();
    generate = vi.fn();
    migrate = vi.fn();
    resetCreate = vi.fn();
    preparedEvents = new Subject<ReturnType<typeof maintenancePlansStoreEvents.planPrepared>>();
    changedEvents = new Subject<ReturnType<typeof maintenancePlansStoreEvents.planChanged>>();
    selectedPlan = signal<MaintenancePlanOutput | null>(null);
    previewState = signal<CallState<MaintenancePlanPreviewOutput>>(idleCallState());
    planEntities = signal<readonly MaintenancePlanOutput[]>([]);
    engineState = signal<CallState<MaintenanceEngineOutput>>(
      successCallState({ mode: 'legacy', preparedCount: 0, conflicts: [] }),
    );
    migrationState = signal<CallState<MaintenanceEngineOutput>>(idleCallState());
    createState = signal<CallState<MaintenancePlanOutput>>(idleCallState());
    updateState = signal<CallState<MaintenancePlanOutput>>(idleCallState());
    commandPending = signal(false);
    permissionGrants = signal<readonly string[]>([
      ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
    ]);
    TestBed.configureTestingModule({
      imports: [MaintenancePlansPage],
      providers: [
        provideRouter([]),
        {
          provide: THEME_PORT,
          useValue: { theme: signal('light'), resolvedTheme: signal('light'), setTheme: vi.fn() },
        },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { interactionMode: signal('desktop'), isMobileInteractionMode: signal(false) },
        },
        {
          provide: MaintenancePlansStore,
          useValue: {
            load,
            loadEngine,
            loadEquipment,
            update,
            create,
            preview,
            generate,
            migrate,
            setScope: vi.fn(),
            resetCreate,
            commandPending,
            totalPlans: signal(0),
            totalEquipment: signal(0),
            planEntities,
            listCallState: signal<CallState>(successCallState(null)),
            engineCallState: engineState,
            migrationCallState: migrationState,
            createCallState: createState,
            updateCallState: updateState,
            equipmentCallState: signal<CallState<readonly EquipmentOutput[]>>(idleCallState()),
            selectedPlan,
            previewCallState: previewState,
            generationCallState:
              signal<CallState<MaintenancePlanGenerationOutput>>(idleCallState()),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: (permission: string) => permissionGrants().includes(permission),
          },
        },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'yyyy-MM-dd', timezone: 'UTC' }) },
        },
        {
          provide: Events,
          useValue: {
            on: (event: unknown) =>
              event === maintenancePlansStoreEvents.planPrepared ? preparedEvents : changedEvents,
          },
        },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('forwards dossier equipment scope and operation kind without loading hidden choices', async () => {
    const fixture = TestBed.createComponent(MaintenancePlansPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('equipmentId', 'equipment-1');
    fixture.componentRef.setInput('operationKind', 'maintenance');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(load).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      options: expect.objectContaining({
        params: { equipmentId: 'equipment-1', operationKind: 'maintenance' },
      }),
    });
    expect(loadEngine).toHaveBeenCalledWith('org-1');
    expect(loadEquipment).not.toHaveBeenCalled();
  });

  it('loads equipment only after explicit new-plan preparation', async () => {
    const fixture = TestBed.createComponent(MaintenancePlansPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    await fixture.whenStable();
    button(fixture.nativeElement as HTMLElement, 'Prepare an operation plan').click();
    expect(loadEquipment).toHaveBeenCalledWith({ organizationId: 'org-1', search: '', page: 1 });
  });

  it.each([
    null,
    { id: 'occurrence-1', dueAt: '2027-02-28T00:00:00+01:00', attempt: 1, status: 'open' as const },
  ])(
    'renames a plan without retransmitting its unchanged calendar with occurrence %s',
    (openOccurrence) => {
      const plan: MaintenancePlanOutput = {
        '@id': '/api/plans/monthly-1',
        '@type': 'MaintenancePlan',
        id: 'monthly-1',
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        equipmentType: 'fire_extinguisher',
        name: 'Monthly maintenance',
        operationKind: 'maintenance',
        interval: 'P1M',
        cadenceMode: 'fixed',
        calendarTimezone: 'Europe/Paris',
        anchorAt: '2027-01-31T00:00:00+01:00',
        nextDueAt: '2027-02-28T00:00:00+01:00',
        active: true,
        openOccurrence,
      };
      const fixture = TestBed.createComponent(MaintenancePlansPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.detectChanges();
      openEditor(fixture, plan);
      planForm(fixture).submitted.emit({
        equipmentId: plan.equipmentId,
        operationKind: plan.operationKind,
        name: 'Renamed maintenance',
        interval: 'P1M',
        anchorOn: '2027-01-31',
        nextDueOn: '2027-02-28',
      });
      expect(update).toHaveBeenCalledWith({
        organizationId: 'org-1',
        planId: 'monthly-1',
        input: { name: 'Renamed maintenance' },
      });
    },
  );

  it('sends a changed calendar only when no occurrence is open', () => {
    const plan: MaintenancePlanOutput = {
      '@id': '/api/plans/monthly-1',
      '@type': 'MaintenancePlan',
      id: 'monthly-1',
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
      equipmentType: 'fire_extinguisher',
      name: 'Monthly maintenance',
      operationKind: 'maintenance',
      interval: 'P1M',
      cadenceMode: 'fixed',
      calendarTimezone: 'Europe/Paris',
      anchorAt: '2027-01-31T00:00:00+01:00',
      nextDueAt: '2027-02-28T00:00:00+01:00',
      active: false,
      openOccurrence: null,
    };
    const fixture = TestBed.createComponent(MaintenancePlansPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    openEditor(fixture, plan);
    planForm(fixture).submitted.emit({
      equipmentId: plan.equipmentId,
      operationKind: plan.operationKind,
      name: plan.name,
      interval: 'P2M',
      anchorOn: '2027-01-31',
      nextDueOn: '2027-03-31',
    });
    expect(update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planId: 'monthly-1',
      input: { name: plan.name, interval: 'P2M', nextDueOn: '2027-03-31' },
    });
    update.mockClear();
    openEditor(fixture, {
      ...plan,
      openOccurrence: {
        id: 'occurrence-1',
        dueAt: plan.nextDueAt as string,
        attempt: 1,
        status: 'open',
      },
    });
    planForm(fixture).submitted.emit({
      equipmentId: plan.equipmentId,
      operationKind: plan.operationKind,
      name: 'Renamed maintenance',
      interval: 'P2M',
      anchorOn: '2027-02-01',
      nextDueOn: '2027-03-31',
    });
    expect(update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planId: 'monthly-1',
      input: { name: 'Renamed maintenance' },
    });
  });

  it('preserves the preview calendar dates across timezone offsets and daylight-saving changes', () => {
    selectedPlan.set({
      '@id': '/api/plans/monthly-1',
      '@type': 'MaintenancePlan',
      id: 'monthly-1',
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
      equipmentType: 'fire_extinguisher',
      name: 'Monthly maintenance',
      operationKind: 'maintenance',
      interval: 'P1M',
      cadenceMode: 'fixed',
      calendarTimezone: 'Europe/Paris',
      anchorAt: '2027-01-31T00:00:00+01:00',
      nextDueAt: '2027-02-28T00:00:00+01:00',
      active: false,
      openOccurrence: null,
    });
    previewState.set(
      successCallState({
        dates: [
          '2027-02-28T00:00:00+01:00',
          '2027-03-31T00:00:00+02:00',
          '2027-04-30T00:00:00+02:00',
        ],
      }),
    );
    const fixture = TestBed.createComponent(MaintenancePlansPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    const previewSection: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="maintenance-plan-preview"]',
    );
    expect(previewSection?.textContent).toContain('2027-02-28');
    expect(previewSection?.textContent).toContain('2027-03-31');
    expect(previewSection?.textContent).toContain('2027-04-30');
    expect(previewSection?.textContent).not.toContain('2027-02-27');
    expect(previewSection?.textContent).not.toContain('2027-03-30');
    expect(previewSection?.textContent).not.toContain('2027-04-29');
  });

  it('submits an inactive preparation and reviews its server calendar before offering activation', async () => {
    const fixture = await render();
    const values: CreateMaintenancePlanInput = {
      equipmentId,
      name: 'Monthly equipment maintenance',
      operationKind: 'maintenance',
      interval: 'P1M',
      anchorOn: '2027-01-31',
      nextDueOn: '2027-02-28',
    };
    button(fixture.nativeElement as HTMLElement, 'Prepare an operation plan').click();
    fixture.detectChanges();
    planForm(fixture).submitted.emit(values);
    expect(create).toHaveBeenCalledExactlyOnceWith({ organizationId, input: values });
    expect(update).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.directive(MaintenancePlanForm))).not.toBeNull();
    preparedEvents.next(
      maintenancePlansStoreEvents.planPrepared({ organizationId, plan: operation() }),
    );
    fixture.detectChanges();
    expect(preview).toHaveBeenCalledExactlyOnceWith(operation());
    expect(fixture.debugElement.query(By.directive(MaintenancePlanForm))).toBeNull();
    selectedPlan.set(operation());
    previewState.set(pendingCallState());
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="maintenance-plan-activate"]',
      ),
    ).toBeNull();
    previewState.set(successCallState({ dates: ['2027-02-28', '2027-03-31', '2027-04-30'] }));
    fixture.detectChanges();
    button(fixture.nativeElement as HTMLElement, 'Activate this operation').click();
    expect(update).toHaveBeenCalledExactlyOnceWith({
      organizationId,
      planId,
      input: { active: true },
    });
  });

  it('keeps empty or unavailable server calendars from activating historical plans', async () => {
    selectedPlan.set(operation({ cadenceMode: 'legacy', nextDueAt: null }));
    previewState.set(errorCallState(toStoreError(new Error('Configure the first deadline.'))));
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="maintenance-plan-activate"]')).toBeNull();
    expect(root.textContent).toContain('Configure the first deadline.');
    button(
      root.querySelector('[data-testid="maintenance-plan-preview"]') as HTMLElement,
      'Retry',
    ).click();
    expect(preview).toHaveBeenCalledWith(operation({ cadenceMode: 'legacy', nextDueAt: null }));
    previewState.set(successCallState({ dates: [] }));
    fixture.detectChanges();
    expect(button(root, 'Activate this operation').disabled).toBe(true);
    button(root, 'Activate this operation').click();
    expect(update).not.toHaveBeenCalled();
    button(root, 'Close preview').click();
    expect(preview).toHaveBeenLastCalledWith(null);
  });

  it('pauses a reviewed active operation with only an activation command', async () => {
    selectedPlan.set(operation({ active: true }));
    previewState.set(successCallState({ dates: ['2027-02-28'] }));
    const fixture = await render();
    button(fixture.nativeElement as HTMLElement, 'Pause this operation').click();
    expect(update).toHaveBeenCalledExactlyOnceWith({
      organizationId,
      planId,
      input: { active: false },
    });
  });

  it.each([
    {
      grants: [] as readonly string[],
      engine: successCallState<MaintenanceEngineOutput>({ mode: 'plans', preparedCount: 1 }),
    },
    {
      grants: [ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE],
      engine: successCallState<MaintenanceEngineOutput>({ mode: 'plans', preparedCount: 1 }),
    },
    {
      grants: [ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN],
      engine: successCallState<MaintenanceEngineOutput>({ mode: 'plans', preparedCount: 1 }),
    },
    {
      grants: [
        ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE,
        ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ],
      engine: successCallState<MaintenanceEngineOutput>({ mode: 'legacy', preparedCount: 1 }),
    },
    {
      grants: [
        ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE,
        ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ],
      engine: pendingCallState<MaintenanceEngineOutput>({ mode: 'plans', preparedCount: 1 }),
    },
    {
      grants: [
        ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE,
        ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ],
      engine: errorCallState<MaintenanceEngineOutput>(
        toStoreError(new Error('Authority unavailable')),
        { mode: 'plans', preparedCount: 1 },
      ),
    },
  ])(
    'offers no generation without both grants and confirmed plans authority: %o',
    async ({ grants, engine }) => {
      permissionGrants.set(grants);
      engineState.set(engine);
      planEntities.set([
        operation({
          active: true,
          openOccurrence: {
            id: '5af04772-8fc9-4a2f-a64f-a1f4d8bbba49',
            dueAt: '2027-02-28T00:00:00+01:00',
            attempt: 2,
            status: 'open',
            retryAllowed: true,
          },
        }),
      ]);
      const fixture = await render();
      const list = fixture.debugElement.query(By.directive(MaintenancePlanList))
        .componentInstance as MaintenancePlanList;
      expect(list.canGenerate()).toBe(false);
      const root = fixture.nativeElement as HTMLElement;
      expect(
        [...root.querySelectorAll('button')].some((candidate) =>
          candidate.textContent?.includes('Prepare intervention'),
        ),
      ).toBe(false);
      expect(
        [...root.querySelectorAll('button')].some((candidate) =>
          candidate.textContent?.includes('Start a new attempt'),
        ),
      ).toBe(false);
      expect(generate).not.toHaveBeenCalled();
      if (!grants.includes(ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE)) {
        expect(list.canManage()).toBe(false);
        expect(root.querySelector('[data-testid="maintenance-prepare-legacy"]')).toBeNull();
        expect(root.querySelector('[data-testid="maintenance-switch-engine"]')).toBeNull();
        expect(fixture.debugElement.query(By.directive(MaintenancePlanForm))).toBeNull();
        expect(create).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
        expect(migrate).not.toHaveBeenCalled();
      }
    },
  );

  it('forwards ordinary recovery separately from the explicit new-attempt action', async () => {
    engineState.set(successCallState({ mode: 'plans', preparedCount: 1 }));
    planEntities.set([
      operation({
        active: true,
        openOccurrence: {
          id: '5af04772-8fc9-4a2f-a64f-a1f4d8bbba49',
          dueAt: '2027-02-28T00:00:00+01:00',
          attempt: 2,
          status: 'open',
          retryAllowed: true,
        },
      }),
    ]);
    const fixture = await render();
    button(fixture.nativeElement as HTMLElement, 'Prepare intervention').click();
    expect(generate).toHaveBeenLastCalledWith({ organizationId, planId, retry: false });
    button(fixture.nativeElement as HTMLElement, 'Start a new attempt').click();
    expect(generate).toHaveBeenLastCalledWith({ organizationId, planId, retry: true });
    commandPending.set(true);
    fixture.detectChanges();
    expect(button(fixture.nativeElement as HTMLElement, 'Prepare intervention').disabled).toBe(
      true,
    );
    expect(button(fixture.nativeElement as HTMLElement, 'Start a new attempt').disabled).toBe(true);
    button(fixture.nativeElement as HTMLElement, 'Start a new attempt').click();
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('retains an open editor and server rejection until a confirmed change closes it', async () => {
    const fixture = await render();
    openEditor(fixture, operation());
    updateState.set(
      errorCallState(toStoreError(new Error('The saved calendar conflicts with open work.'))),
    );
    fixture.detectChanges();
    expect(planForm(fixture).serverError()?.message).toBe(
      'The saved calendar conflicts with open work.',
    );
    commandPending.set(true);
    fixture.detectChanges();
    expect(planForm(fixture).pending()).toBe(true);
    expect(button(fixture.nativeElement as HTMLElement, 'Prepare an operation plan').disabled).toBe(
      true,
    );
    updateState.set(successCallState(operation({ name: 'Confirmed name' })));
    commandPending.set(false);
    selectedPlan.set(operation({ name: 'Confirmed name' }));
    changedEvents.next(maintenancePlansStoreEvents.planChanged({ organizationId }));
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(MaintenancePlanForm))).toBeNull();
    expect(preview).toHaveBeenLastCalledWith(operation({ name: 'Confirmed name' }));
  });

  it('forwards equipment search and pagination from the editor and cancels without writing', async () => {
    const fixture = await render();
    button(fixture.nativeElement as HTMLElement, 'Prepare an operation plan').click();
    fixture.detectChanges();
    const form = planForm(fixture);
    form.equipmentSearched.emit('Extinguisher');
    expect(loadEquipment).toHaveBeenLastCalledWith({
      organizationId,
      search: 'Extinguisher',
      page: 1,
    });
    form.equipmentPageChanged.emit(2);
    expect(loadEquipment).toHaveBeenLastCalledWith({
      organizationId,
      search: 'Extinguisher',
      page: 2,
    });
    form.cancelled.emit();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(MaintenancePlanForm))).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('ignores previous-organization command events after route context changes', async () => {
    const fixture = await render();
    button(fixture.nativeElement as HTMLElement, 'Prepare an operation plan').click();
    fixture.detectChanges();
    fixture.componentRef.setInput('organizationId', 'e6c7893c-cbd6-416a-97a1-65f10af08d51');
    fixture.detectChanges();
    await fixture.whenStable();
    const readsAfterNavigation = load.mock.calls.length;
    preparedEvents.next(
      maintenancePlansStoreEvents.planPrepared({ organizationId, plan: operation() }),
    );
    changedEvents.next(maintenancePlansStoreEvents.planChanged({ organizationId }));
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(MaintenancePlanForm))).toBeNull();
    expect(preview).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(readsAfterNavigation);
    expect(loadEngine).toHaveBeenLastCalledWith('e6c7893c-cbd6-416a-97a1-65f10af08d51');
  });

  it('prepares legacy history without switching authority', async () => {
    const fixture = await render();
    button(fixture.nativeElement as HTMLElement, 'Prepare historical plans').click();
    expect(migrate).toHaveBeenCalledExactlyOnceWith({ organizationId, activate: false });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Historical scheduling remains active',
    );
    expect(document.querySelector('[data-testid="maintenance-confirm-switch"]')).toBeNull();
  });

  it('keeps a rejected authority switch open for correction and closes after server confirmation', async () => {
    const fixture = await render();
    button(fixture.nativeElement as HTMLElement, 'Review scheduling switch').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const confirmation = document.querySelector<HTMLButtonElement>(
      '[data-testid="maintenance-confirm-switch"]',
    );
    expect(confirmation).not.toBeNull();
    confirmation?.click();
    expect(migrate).toHaveBeenCalledExactlyOnceWith({ organizationId, activate: true });
    migrationState.set(
      errorCallState(toStoreError(new Error('Resolve ambiguous historical intervention links.'))),
    );
    fixture.detectChanges();
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
      'Resolve ambiguous historical intervention links.',
    );
    engineState.set(successCallState({ mode: 'plans', preparedCount: 3 }));
    migrationState.set(successCallState({ mode: 'plans', preparedCount: 3 }));
    changedEvents.next(maintenancePlansStoreEvents.planChanged({ organizationId }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="maintenance-confirm-switch"]')).toBeNull();
  });

  it('busy-locks the authority confirmation until its accepted command settles', async () => {
    const fixture = await render();
    button(fixture.nativeElement as HTMLElement, 'Review scheduling switch').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = fixture.debugElement.query(By.directive(HlmAlertDialog))
      .componentInstance as HlmAlertDialog;
    expect(dialog.state()).toBe('open');
    migrationState.set(pendingCallState());
    commandPending.set(true);
    fixture.detectChanges();
    expect(dialog.disableClose()).toBe(true);
    expect(button(document, 'Activate operation plans').disabled).toBe(true);
    expect(button(document, 'Cancel').disabled).toBe(true);
    dialog.stateChanged.emit('closed');
    fixture.detectChanges();
    expect(dialog.state()).toBe('open');
    migrationState.set(errorCallState(toStoreError(new Error('Resolve historical links.'))));
    commandPending.set(false);
    fixture.detectChanges();
    expect(dialog.disableClose()).toBe(false);
    dialog.stateChanged.emit('closed');
    fixture.detectChanges();
    expect(dialog.state()).toBe('closed');
  });

  it('forwards server search and pagination while operation tabs reset the list page', async () => {
    const fixture = await render();
    const pagination = fixture.debugElement.query(By.directive(CollectionPagination))
      .componentInstance as CollectionPagination;
    const search = fixture.debugElement.query(By.directive(CollectionSearchBox))
      .componentInstance as CollectionSearchBox;
    pagination.pageChanged.emit(3);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(load).toHaveBeenLastCalledWith({
      organizationId,
      options: { search: '', page: 3, itemsPerPage: 30, params: { operationKind: 'control' } },
    });
    button(fixture.nativeElement as HTMLElement, 'Maintenance').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(load).toHaveBeenLastCalledWith({
      organizationId,
      options: { search: '', page: 1, itemsPerPage: 30, params: { operationKind: 'maintenance' } },
    });
    pagination.pageSizeChanged.emit(60);
    search.queryChanged.emit('Monthly');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(load).toHaveBeenLastCalledWith({
      organizationId,
      options: {
        search: 'Monthly',
        page: 1,
        itemsPerPage: 60,
        params: { operationKind: 'maintenance' },
      },
    });
  });
});
