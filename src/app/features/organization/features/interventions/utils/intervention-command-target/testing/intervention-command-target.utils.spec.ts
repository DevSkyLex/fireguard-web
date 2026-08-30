import type { InterventionTransitionSubject } from '@features/organization/features/interventions/models';
import { resolveCommandTransitionTarget } from '../intervention-command-target.utils';

const subject = (
  status: InterventionTransitionSubject['status'],
  allowedTransitions?: InterventionTransitionSubject['allowedTransitions'],
): InterventionTransitionSubject => ({ status, allowedTransitions });

describe('resolveCommandTransitionTarget', () => {
  it('starts the field work from planned, instead of a submit the server refuses', () => {
    expect(resolveCommandTransitionTarget(subject('planned'))).toBe('in_progress');
  });

  it('plans a draft', () => {
    expect(resolveCommandTransitionTarget(subject('draft'))).toBe('planned');
  });

  it('submits work in progress', () => {
    expect(resolveCommandTransitionTarget(subject('in_progress'))).toBe('submitted');
  });

  it('resubmits from changes_requested rather than re-entering in_progress', () => {
    expect(resolveCommandTransitionTarget(subject('changes_requested'))).toBe('submitted');
  });

  it('has nothing ahead of a submitted card, so publication owns the next step', () => {
    expect(resolveCommandTransitionTarget(subject('submitted'))).toBeNull();
  });

  it('has nothing ahead of a terminal card', () => {
    expect(resolveCommandTransitionTarget(subject('published'))).toBeNull();
    expect(resolveCommandTransitionTarget(subject('abandoned'))).toBeNull();
  });

  it('never proposes abandonment as the forward command', () => {
    expect(resolveCommandTransitionTarget(subject('draft', ['abandoned']))).toBeNull();
  });

  it("honours the API's own policy over the static table", () => {
    expect(resolveCommandTransitionTarget(subject('planned', ['submitted']))).toBe('submitted');
    expect(resolveCommandTransitionTarget(subject('planned', []))).toBeNull();
  });
});
