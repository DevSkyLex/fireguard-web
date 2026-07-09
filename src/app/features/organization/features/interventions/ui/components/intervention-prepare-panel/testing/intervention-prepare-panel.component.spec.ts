import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  CreateInterventionWorkItemInput,
  InterventionOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import type { InterventionReadinessCheck } from '@features/organization/features/interventions/ui/components/intervention-readiness-checklist';
import type { InterventionWorkItemFormValues } from '@features/organization/features/interventions/ui/forms';
import { InterventionPreparePanel } from '../intervention-prepare-panel.component';

type InterventionPreparePanelHarness = {
  readonly siteLabel: () => string | null;
  readonly responsibleMember: () => MemberSelectOption | null;
  readonly participantMembers: () => readonly MemberSelectOption[];
  readonly readinessChecks: () => readonly InterventionReadinessCheck[];
  readonly canAddWorkItem: () => boolean;
  readonly canDeleteWorkItem: () => boolean;
  addWorkItem(values: InterventionWorkItemFormValues): void;
  readonly createWorkItem: {
    subscribe(listener: (value: CreateInterventionWorkItemInput) => void): { unsubscribe(): void };
  };
};

const draftIntervention = {
  id: 'intervention-1',
  status: 'draft',
  site: '/api/sites/s-1',
  responsible: '/api/members/1',
  participants: ['/api/members/1'],
  plannedStartAt: '2026-06-20T08:00:00Z',
  dueAt: '2026-06-20T12:00:00Z',
  facilitiesCount: 0,
  equipmentCount: 0,
} as unknown as InterventionOutput;

const siteOptions: readonly SelectOption[] = [{ value: '/api/sites/s-1', label: 'Main site' }];
const memberOptions: readonly MemberSelectOption[] = [
  {
    value: '/api/members/1',
    label: 'Jane Doe',
    displayName: 'Jane Doe',
    roleLabel: 'Technician',
    avatarUrl: null,
    initials: 'JD',
  },
];

/** Counts the satisfied readiness conditions surfaced by the panel. */
function doneCount(harness: InterventionPreparePanelHarness): number {
  return harness.readinessChecks().filter((check: InterventionReadinessCheck) => check.done).length;
}

describe('InterventionPreparePanel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionPreparePanel],
    }).overrideComponent(InterventionPreparePanel, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(
    overrides: { readonly canPlan?: boolean; readonly online?: boolean } = {},
  ): InterventionPreparePanelHarness {
    const fixture = TestBed.createComponent(InterventionPreparePanel);
    fixture.componentRef.setInput('intervention', draftIntervention);
    fixture.componentRef.setInput('workItems', []);
    fixture.componentRef.setInput('siteOptions', siteOptions);
    fixture.componentRef.setInput('memberOptions', memberOptions);
    fixture.componentRef.setInput('targetOptions', []);
    fixture.componentRef.setInput('canPlan', overrides.canPlan ?? true);
    fixture.componentRef.setInput('online', overrides.online ?? true);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionPreparePanelHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should resolve the site label and people from the selector options', () => {
    const component = createComponent();

    expect(component.siteLabel()).toBe('Main site');
    expect(component.responsibleMember()?.displayName).toBe('Jane Doe');
    expect(component.participantMembers()).toHaveLength(1);
  });

  it('should mark every backend precondition ready for a fully scheduled draft', () => {
    const component = createComponent();

    // All four backend preconditions (site, responsible, planned start, due
    // date) are satisfied (4/4); work items are never part of this checklist —
    // they stay a soft recommendation and do not gate planning.
    expect(doneCount(component)).toBe(4);
    expect(component.canAddWorkItem()).toBe(true);
  });

  it('should report a partial readiness count when a precondition is missing', () => {
    const fixture = TestBed.createComponent(InterventionPreparePanel);
    fixture.componentRef.setInput('intervention', { ...draftIntervention, dueAt: null });
    fixture.componentRef.setInput('workItems', []);
    fixture.componentRef.setInput('siteOptions', siteOptions);
    fixture.componentRef.setInput('memberOptions', memberOptions);
    fixture.componentRef.setInput('targetOptions', []);
    fixture.componentRef.setInput('canPlan', true);
    fixture.detectChanges();

    const partial = fixture.componentInstance as unknown as InterventionPreparePanelHarness;
    expect(doneCount(partial)).toBe(3);
  });

  it('should gate work-item deletion on connectivity', () => {
    expect(createComponent({ online: true }).canDeleteWorkItem()).toBe(true);
    expect(createComponent({ online: false }).canDeleteWorkItem()).toBe(false);
  });

  it('should block work-item authoring when the user may not plan', () => {
    const component = createComponent({ canPlan: false });

    expect(component.canAddWorkItem()).toBe(false);
    expect(component.canDeleteWorkItem()).toBe(false);
  });

  it('should map and emit a planned work item from the form values', () => {
    const component = createComponent();
    let emitted: CreateInterventionWorkItemInput | undefined;
    component.createWorkItem.subscribe((value) => (emitted = value));

    component.addWorkItem({
      action: 'inspection',
      target: '  /api/equipment/1  ',
      assignee: '',
    } as InterventionWorkItemFormValues);

    expect(emitted).toEqual({
      intervention: '/api/interventions/intervention-1',
      action: 'inspection',
      target: '/api/equipment/1',
      assignee: null,
      source: 'planned',
      required: true,
    });
  });
});
