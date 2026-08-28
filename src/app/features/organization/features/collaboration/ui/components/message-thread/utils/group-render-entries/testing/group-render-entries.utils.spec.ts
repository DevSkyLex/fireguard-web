import type {
  MessageThreadEntry,
  MessageView,
} from '@features/organization/features/collaboration/models';
import type { MessageThreadRenderGroup } from '../../../models';
import { groupRenderEntries } from '../group-render-entries.utils';

function view(overrides: Partial<MessageView> = {}): MessageView {
  return {
    id: 'message-1',
    authorId: 'member-1',
    authorName: 'Amélie Rousseau',
    bodyHtml: '<p>Bonjour</p>',
    createdAt: new Date(2026, 0, 1, 9, 0).toISOString(),
    isDeleted: false,
    isOwn: false,
    status: 'sent',
    isPinned: false,
    isSaved: false,
    replyCount: 0,
    canEdit: false,
    canDelete: false,
    reactions: [],
    ...overrides,
  };
}

describe('groupRenderEntries', () => {
  it('should return nothing for an empty thread', () => {
    expect(groupRenderEntries([])).toEqual([]);
  });

  it('should pass a date rule through as its own group', () => {
    const entries: readonly MessageThreadEntry[] = [
      { kind: 'day', day: '2026-01-01', at: view().createdAt },
    ];

    expect(groupRenderEntries(entries)).toEqual([
      { kind: 'day', day: '2026-01-01', at: view().createdAt },
    ]);
  });

  it('should fold consecutive continuation messages into one run', () => {
    const first = view({ id: 'a' });
    const second = view({ id: 'b' });
    const entries: readonly MessageThreadEntry[] = [
      { kind: 'message', message: first, continuation: false },
      { kind: 'message', message: second, continuation: true },
    ];

    const groups: readonly MessageThreadRenderGroup[] = groupRenderEntries(entries);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: 'run', key: 'a' });
    expect(groups[0].kind === 'run' && groups[0].entries.map((entry) => entry.message.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('should start a new run once continuation breaks', () => {
    const first = view({ id: 'a' });
    const second = view({ id: 'b' });
    const entries: readonly MessageThreadEntry[] = [
      { kind: 'message', message: first, continuation: false },
      { kind: 'message', message: second, continuation: false },
    ];

    const groups: readonly MessageThreadRenderGroup[] = groupRenderEntries(entries);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.kind)).toEqual(['run', 'run']);
  });

  it('should start a fresh run after a day rule even if it never combines with the one before it', () => {
    const before = view({ id: 'a', createdAt: new Date(2026, 0, 1, 9, 0).toISOString() });
    const after = view({ id: 'b', createdAt: new Date(2026, 0, 2, 9, 0).toISOString() });
    const entries: readonly MessageThreadEntry[] = [
      { kind: 'message', message: before, continuation: false },
      { kind: 'day', day: '2026-01-02', at: after.createdAt },
      { kind: 'message', message: after, continuation: false },
    ];

    const groups: readonly MessageThreadRenderGroup[] = groupRenderEntries(entries);

    expect(groups.map((group) => group.kind)).toEqual(['run', 'day', 'run']);
  });
});
