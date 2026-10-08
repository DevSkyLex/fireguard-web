import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { EMPTY } from 'rxjs';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  MaintenanceEngineOutput,
  MaintenancePlanOutput,
  MaintenancePlanPreviewOutput,
  MaintenancePlanGenerationOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { MaintenancePlansStore } from '@features/organization/features/maintenance-schedules/state';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { MaintenancePlansPage } from '../maintenance-plans-page.component';

describe('MaintenancePlansPage', () => {
  let load: ReturnType<typeof vi.fn>;
  let loadEngine: ReturnType<typeof vi.fn>;
  let loadEquipment: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let selectedPlan: WritableSignal<MaintenancePlanOutput | null>;
  let previewState: WritableSignal<CallState<MaintenancePlanPreviewOutput>>;
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
    selectedPlan = signal<MaintenancePlanOutput | null>(null);
    previewState = signal<CallState<MaintenancePlanPreviewOutput>>(idleCallState());
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
            setScope: vi.fn(),
            resetCreate: vi.fn(),
            commandPending: signal(false),
            totalPlans: signal(0),
            totalEquipment: signal(0),
            planEntities: signal<readonly MaintenancePlanOutput[]>([]),
            listCallState: signal<CallState>(successCallState(null)),
            engineCallState: signal<CallState<MaintenanceEngineOutput>>(
              successCallState({ mode: 'legacy', preparedCount: 0, conflicts: [] }),
            ),
            migrationCallState: signal<CallState<MaintenanceEngineOutput>>(idleCallState()),
            createCallState: signal<CallState<MaintenancePlanOutput>>(idleCallState()),
            updateCallState: signal<CallState<MaintenancePlanOutput>>(idleCallState()),
            equipmentCallState: signal<CallState<readonly EquipmentOutput[]>>(idleCallState()),
            selectedPlan,
            previewCallState: previewState,
            generationCallState:
              signal<CallState<MaintenancePlanGenerationOutput>>(idleCallState()),
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'yyyy-MM-dd', timezone: 'UTC' }) },
        },
        { provide: Events, useValue: { on: () => EMPTY } },
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
    fixture.componentInstance['openForm'](null);
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
      fixture.componentInstance['openForm'](plan);
      fixture.componentInstance['submitPlan']({
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
    fixture.componentInstance['openForm'](plan);
    fixture.componentInstance['submitPlan']({
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
    fixture.componentInstance['openForm']({
      ...plan,
      openOccurrence: {
        id: 'occurrence-1',
        dueAt: plan.nextDueAt as string,
        attempt: 1,
        status: 'open',
      },
    });
    fixture.componentInstance['submitPlan']({
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
    const preview: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="maintenance-plan-preview"]',
    );
    expect(preview?.textContent).toContain('2027-02-28');
    expect(preview?.textContent).toContain('2027-03-31');
    expect(preview?.textContent).toContain('2027-04-30');
    expect(preview?.textContent).not.toContain('2027-02-27');
    expect(preview?.textContent).not.toContain('2027-03-30');
    expect(preview?.textContent).not.toContain('2027-04-29');
  });
});
