import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  CreateInterventionWorkItemInput,
  InterventionOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import type { InterventionWorkItemFormValues } from '@features/organization/features/interventions/ui/forms';
import { InterventionPreparePanel } from '../intervention-prepare-panel.component';

type InterventionPreparePanelHarness = {
  readonly siteLabel: () => string | null;
  readonly responsibleMember: () => MemberSelectOption | null;
  readonly participantMembers: () => readonly MemberSelectOption[];
  readonly readyCount: () => number;
  readonly canSubmitPlan: () => boolean;
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

  it('should allow submitting a scheduled draft while work items remain a soft recommendation', () => {
    const component = createComponent();

    // Site/responsible + schedule are satisfied (2/3); the work-item check stays
    // open, yet planning can still be confirmed because it is not a hard gate.
    expect(component.readyCount()).toBe(2);
    expect(component.canSubmitPlan()).toBe(true);
    expect(component.canAddWorkItem()).toBe(true);
  });

  it('should gate work-item deletion on connectivity', () => {
    expect(createComponent({ online: true }).canDeleteWorkItem()).toBe(true);
    expect(createComponent({ online: false }).canDeleteWorkItem()).toBe(false);
  });

  it('should block planning affordances when the user may not plan', () => {
    const component = createComponent({ canPlan: false });

    expect(component.canSubmitPlan()).toBe(false);
    expect(component.canAddWorkItem()).toBe(false);
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
