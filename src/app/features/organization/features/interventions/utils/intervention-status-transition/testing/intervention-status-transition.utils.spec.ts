import { allowedTransitions } from '../intervention-status-transition.utils';

describe('intervention status transition utils', () => {
  it('exposes the allowed targets per status', () => {
    expect(allowedTransitions('changes_requested')).toEqual([
      'in_progress',
      'submitted',
      'abandoned',
    ]);
    expect(allowedTransitions('submitted')).toEqual(['changes_requested', 'in_progress']);
    expect(allowedTransitions('published')).toEqual([]);
  });
});
