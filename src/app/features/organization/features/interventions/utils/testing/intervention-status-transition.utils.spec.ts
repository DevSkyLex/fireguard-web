import {
  allowedTransitions,
  canTransition,
  columnIdForStatus,
  dropTargetForColumn,
} from '../intervention-status-transition.utils';

describe('intervention status transition utils', () => {
  it('allows policy transitions and no-op moves', () => {
    expect(canTransition('draft', 'planned')).toBe(true);
    expect(canTransition('planned', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'submitted')).toBe(true);
    expect(canTransition('changes_requested', 'in_progress')).toBe(true);
    expect(canTransition('draft', 'draft')).toBe(true);
  });

  it('rejects illegal transitions, including publish', () => {
    expect(canTransition('draft', 'in_progress')).toBe(false);
    expect(canTransition('submitted', 'in_progress')).toBe(false);
    expect(canTransition('submitted', 'published')).toBe(false);
    expect(canTransition('published', 'planned')).toBe(false);
  });

  it('exposes the allowed targets per status', () => {
    expect(allowedTransitions('changes_requested')).toEqual([
      'in_progress',
      'submitted',
      'abandoned',
    ]);
    expect(allowedTransitions('published')).toEqual([]);
  });

  it('maps statuses to lanes, fusing the review lane', () => {
    expect(columnIdForStatus('submitted')).toBe('review');
    expect(columnIdForStatus('changes_requested')).toBe('review');
    expect(columnIdForStatus('in_progress')).toBe('in_progress');
    expect(columnIdForStatus('abandoned')).toBeNull();
  });

  it('resolves the drop target per lane', () => {
    expect(dropTargetForColumn('draft')).toBe('draft');
    expect(dropTargetForColumn('review')).toBe('submitted');
    expect(dropTargetForColumn('published')).toBeNull();
  });
});
