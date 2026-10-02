import { resolveInterventionViewCriteria } from '../intervention-view-criteria.utils';

describe('resolveInterventionViewCriteria', () => {
  it.each([
    [undefined, true, 'list'],
    ['', true, 'list'],
    ['unknown', true, 'list'],
    ['list', true, 'list'],
    ['board', false, 'board'],
    ['calendar', false, 'calendar'],
    ['recurrences', false, 'list'],
    ['recurrences', true, 'recurrences'],
  ] as const)(
    'resolves requested %s with recurring access %s to %s',
    (requested, allowed, expected) => {
      expect(resolveInterventionViewCriteria(requested, allowed).view).toBe(expected);
    },
  );

  it('keeps the List catalogue complete and in filter menu order', () => {
    expect(resolveInterventionViewCriteria('list', true).filterKeys).toEqual([
      'status',
      'type',
      'priority',
      'site',
      'responsible',
      'label',
      'dueRange',
      'plannedStartRange',
      'dueWindow',
    ]);
  });

  it('delegates Board status to columns while retaining its other criteria', () => {
    expect(resolveInterventionViewCriteria('board', true).filterKeys).toEqual([
      'type',
      'priority',
      'site',
      'responsible',
      'label',
      'dueRange',
      'plannedStartRange',
      'dueWindow',
    ]);
  });

  it('limits Calendar to its published API filters and Recurrences to no chips', () => {
    expect(resolveInterventionViewCriteria('calendar', true).filterKeys).toEqual([
      'status',
      'type',
      'site',
      'responsible',
    ]);
    expect(resolveInterventionViewCriteria('recurrences', true).filterKeys).toEqual([]);
  });
});
