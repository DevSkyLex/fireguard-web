import { TestBed } from '@angular/core/testing';
import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { InterventionPhaseStepper } from '../intervention-phase-stepper.component';
import type { InterventionPhaseStep } from '../models';

type InterventionPhaseStepperHarness = {
  readonly steps: () => readonly InterventionPhaseStep[];
};

describe('InterventionPhaseStepper', () => {
  function build(status: InterventionOutput['status']): InterventionPhaseStepperHarness {
    const fixture = TestBed.createComponent(InterventionPhaseStepper);
    fixture.componentRef.setInput('status', status);
    return fixture.componentInstance as unknown as InterventionPhaseStepperHarness;
  }

  function states(status: InterventionStatus): readonly InterventionPhaseStep['state'][] {
    return build(status)
      .steps()
      .map((step) => step.state);
  }

  it('should mark preparation active for a draft', () => {
    expect(states('draft')).toEqual(['active', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('should mark execution active for planned, in progress and changes requested', () => {
    expect(states('planned')).toEqual(['done', 'active', 'upcoming', 'upcoming']);
    expect(states('in_progress')).toEqual(['done', 'active', 'upcoming', 'upcoming']);
    expect(states('changes_requested')).toEqual(['done', 'active', 'upcoming', 'upcoming']);
  });

  it('should mark review active for a submitted intervention', () => {
    expect(states('submitted')).toEqual(['done', 'done', 'active', 'upcoming']);
  });

  it('should mark every milestone done once published', () => {
    expect(states('published')).toEqual(['done', 'done', 'done', 'done']);
  });

  it('should mark every milestone upcoming for an abandoned intervention', () => {
    expect(states('abandoned')).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });
});
