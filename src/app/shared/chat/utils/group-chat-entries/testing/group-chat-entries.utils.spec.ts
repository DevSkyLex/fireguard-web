import type { ChatMessageItem } from '../../../models';
import { groupChatEntries } from '../group-chat-entries.utils';

function message(overrides: Partial<ChatMessageItem>): ChatMessageItem {
  return {
    id: 'm1',
    authorId: 'a1',
    authorName: 'Ana Costa',
    bodyHtml: '<p>ok</p>',
    createdAt: '2026-07-20T09:00:00+00:00',
    isDeleted: false,
    isSaved: false,
    isPinned: false,
    canDelete: false,
    replyCount: 0,
    status: 'sent',
    reactions: [],
    attachments: [],
    ...overrides,
  };
}

describe('groupChatEntries', () => {
  it('returns nothing for an empty thread', () => {
    expect(groupChatEntries([])).toEqual([]);
  });

  it('opens with a day separator', () => {
    const [first] = groupChatEntries([message({})]);

    expect(first.kind).toBe('day');
  });

  it('folds a same-author run inside the window into one header', () => {
    const entries = groupChatEntries([
      message({ id: 'm1', createdAt: '2026-07-20T09:00:00+00:00' }),
      message({ id: 'm2', createdAt: '2026-07-20T09:02:00+00:00' }),
    ]);

    expect(
      entries.filter((entry) => entry.kind === 'message').map((entry) => entry.continuation),
    ).toEqual([false, true]);
  });

  it('breaks the run on a new author', () => {
    const entries = groupChatEntries([
      message({ id: 'm1', authorId: 'a1' }),
      message({ id: 'm2', authorId: 'a2', createdAt: '2026-07-20T09:01:00+00:00' }),
    ]);

    expect(
      entries.filter((entry) => entry.kind === 'message').map((entry) => entry.continuation),
    ).toEqual([false, false]);
  });

  it('breaks the run past the window, and honours a caller-set one', () => {
    const messages = [
      message({ id: 'm1', createdAt: '2026-07-20T09:00:00+00:00' }),
      message({ id: 'm2', createdAt: '2026-07-20T09:06:00+00:00' }),
    ];

    const withDefault = groupChatEntries(messages).filter((entry) => entry.kind === 'message');
    expect(withDefault.map((entry) => entry.continuation)).toEqual([false, false]);

    // Ten minutes: the same pair now reads as one run.
    const withWider = groupChatEntries(messages, 10 * 60 * 1000).filter(
      (entry) => entry.kind === 'message',
    );
    expect(withWider.map((entry) => entry.continuation)).toEqual([false, true]);
  });

  it('never absorbs a deleted message into a run', () => {
    const entries = groupChatEntries([
      message({ id: 'm1', createdAt: '2026-07-20T09:00:00+00:00' }),
      message({ id: 'm2', createdAt: '2026-07-20T09:01:00+00:00', isDeleted: true }),
      message({ id: 'm3', createdAt: '2026-07-20T09:02:00+00:00' }),
    ]);

    expect(
      entries.filter((entry) => entry.kind === 'message').map((entry) => entry.continuation),
    ).toEqual([false, false, false]);
  });

  it('separates calendar days', () => {
    const entries = groupChatEntries([
      message({ id: 'm1', createdAt: '2026-07-20T09:00:00+00:00' }),
      message({ id: 'm2', createdAt: '2026-07-21T09:00:00+00:00' }),
    ]);

    expect(entries.filter((entry) => entry.kind === 'day')).toHaveLength(2);
  });
});
