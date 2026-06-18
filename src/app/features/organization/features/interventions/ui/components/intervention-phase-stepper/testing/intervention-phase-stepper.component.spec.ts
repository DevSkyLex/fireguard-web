import { TestBed } from '@angular/core/testing';
import type {
  InterventionPhase,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { InterventionPhaseStepper } from '../intervention-phase-stepper.component';

type InterventionPhaseStepperHarness = {
  steps(): readonly { readonly key: string; readonly state: string }[];
};

describe('InterventionPhaseStepper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InterventionPhaseStepper] });
  });

  function build(
    phase: InterventionPhase,
    status: InterventionStatus,
  ): InterventionPhaseStepperHarness {
    const fixture = TestBed.createComponent(InterventionPhaseStepper);
    fixture.componentRef.setInput('phase', phase);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionPhaseStepperHarness;
  }

  it('should create', () => {
    expect(build('prepare', 'draft')).toBeTruthy();
  });

  it('should expose the three workflow phases in order', () => {
    expect(
      build('prepare', 'draft')
        .steps()
        .map((step) => step.key),
    ).toEqual(['prepare', 'execute', 'review']);
  });

  it('should mark only the prepare node current while drafting', () => {
    expect(
      build('prepare', 'draft')
        .steps()
        .map((step) => step.state),
    ).toEqual(['current', 'upcoming', 'upcoming']);
  });

  it('should clear prepare and activate execute once in progress', () => {
    expect(
      build('execute', 'in_progress')
        .steps()
        .map((step) => step.state),
    ).toEqual(['done', 'current', 'upcoming']);
  });

  it('should clear prepare and execute while a submitted intervention is under review', () => {
    expect(
      build('review', 'submitted')
        .steps()
        .map((step) => step.state),
    ).toEqual(['done', 'done', 'current']);
  });

  it('should mark every node done once the intervention is published', () => {
    expect(
      build('review', 'published')
        .steps()
        .map((step) => step.state),
    ).toEqual(['done', 'done', 'done']);
  });
});
