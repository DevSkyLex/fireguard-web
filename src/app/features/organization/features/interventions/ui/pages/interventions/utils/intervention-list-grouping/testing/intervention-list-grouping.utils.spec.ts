import type {
  InterventionOutput,
  MemberAvatar,
} from '@features/organization/features/interventions/models';
import type { InterventionListItemViewModel } from '../../../models';
import { groupInterventions } from '../intervention-list-grouping.utils';

const NOW = new Date('2026-08-04T12:00:00.000Z');

const row = (
  overrides: Partial<InterventionOutput> & { readonly id: string },
  siteName: string | null = null,
): InterventionListItemViewModel => ({
  intervention: {
    status: 'planned',
    dueAt: null,
    responsible: null,
    ...overrides,
  } as InterventionOutput,
  isOverdue: false,
  isDueSoon: false,
  siteName,
  people: [] as readonly MemberAvatar[],
});

const noMembers = (): string | null => null;

describe('groupInterventions', () => {
  it('should order status sections by the workflow, not alphabetically', () => {
    const groups = groupInterventions(
      [
        row({ id: 'a', status: 'draft' }),
        row({ id: 'b', status: 'in_progress' }),
        row({ id: 'c', status: 'planned' }),
      ],
      'status',
      NOW,
      noMembers,
    );

    expect(groups.map((group) => group.id)).toEqual(['in_progress', 'planned', 'draft']);
    expect(groups.every((group) => group.isStatus)).toBe(true);
  });

  it('should drop empty sections so no heading stands alone', () => {
    const groups = groupInterventions(
      [row({ id: 'a', status: 'draft' })],
      'status',
      NOW,
      noMembers,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('draft');
  });

  it('should bucket deadlines into overdue, today, this week, later and none', () => {
    const groups = groupInterventions(
      [
        row({ id: 'late', dueAt: '2026-08-01T12:00:00.000Z' }),
        row({ id: 'today', dueAt: '2026-08-04T18:00:00.000Z' }),
        row({ id: 'week', dueAt: '2026-08-08T12:00:00.000Z' }),
        row({ id: 'later', dueAt: '2026-09-30T12:00:00.000Z' }),
        row({ id: 'never', dueAt: null }),
      ],
      'dueWindow',
      NOW,
      noMembers,
    );

    expect(groups.map((group) => group.id)).toEqual([
      'due-overdue',
      'due-today',
      'due-week',
      'due-later',
      'due-none',
    ]);
    expect(groups.every((group) => group.isStatus)).toBe(false);
  });

  it('should treat an unparseable deadline as no deadline rather than as overdue', () => {
    const groups = groupInterventions(
      [row({ id: 'broken', dueAt: 'not-a-date' })],
      'dueWindow',
      NOW,
      noMembers,
    );

    expect(groups.map((group) => group.id)).toEqual(['due-none']);
  });

  it('should group by site and sort the sections by name', () => {
    const groups = groupInterventions(
      [row({ id: 'a' }, 'Workshop'), row({ id: 'b' }, 'Depot'), row({ id: 'c' }, 'Workshop')],
      'site',
      NOW,
      noMembers,
    );

    expect(groups.map((group) => group.label)).toEqual(['Depot', 'Workshop']);
    expect(groups[1].items).toHaveLength(2);
  });

  it('should read the unassigned section last, being an absence rather than a peer', () => {
    const groups = groupInterventions(
      [row({ id: 'a' }, null), row({ id: 'b' }, 'Workshop')],
      'site',
      NOW,
      noMembers,
    );

    expect(groups.at(-1)?.items.map((item) => item.intervention.id)).toEqual(['a']);
  });

  it('should resolve responsible names through the caller, keeping the util free of stores', () => {
    const groups = groupInterventions(
      [
        row({ id: 'a', responsible: '/api/members/1' }),
        row({ id: 'b', responsible: '/api/members/2' }),
      ],
      'responsible',
      NOW,
      (iri) => (iri === '/api/members/1' ? 'Amelie' : 'Bruno'),
    );

    expect(groups.map((group) => group.label)).toEqual(['Amelie', 'Bruno']);
  });
});
