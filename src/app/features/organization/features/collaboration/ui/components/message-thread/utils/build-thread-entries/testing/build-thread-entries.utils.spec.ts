import type {
  MessageDayEntry,
  MessageRowEntry,
  MessageThreadEntry,
  MessageView,
} from '@features/organization/features/collaboration/models';
import { buildThreadEntries } from '../build-thread-entries.utils';

/**
 * An instant expressed in local time.
 *
 * Date rules are drawn on the reader's calendar day, so a fixture written in
 * UTC would put the rule in a different place depending on where the suite
 * runs.
 */
function at(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number = 0,
): string {
  return new Date(year, month - 1, day, hour, minute, second).toISOString();
}

function view(overrides: Partial<MessageView> = {}): MessageView {
  return {
    id: 'message-1',
    authorId: 'member-1',
    authorName: 'Amélie Rousseau',
    bodyHtml: '<p>Bonjour</p>',
    createdAt: at(2026, 1, 1, 9, 0),
    isDeleted: false,
    isOwn: false,
    status: 'sent',
    reactions: [],
    ...overrides,
  };
}

function kinds(entries: readonly MessageThreadEntry[]): readonly string[] {
  return entries.map((entry: MessageThreadEntry): string => entry.kind);
}

function continuations(entries: readonly MessageThreadEntry[]): readonly boolean[] {
  return entries
    .filter((entry: MessageThreadEntry): entry is MessageRowEntry => entry.kind === 'message')
    .map((entry: MessageRowEntry): boolean => entry.continuation);
}

describe('buildThreadEntries', () => {
  it('should return nothing for an empty thread', () => {
    expect(buildThreadEntries([])).toEqual([]);
  });

  it('should open with a date rule', () => {
    const entries = buildThreadEntries([view()]);

    expect(kinds(entries)).toEqual(['day', 'message']);
    expect((entries[0] as MessageDayEntry).at).toBe(at(2026, 1, 1, 9, 0));
  });

  it('should rule between calendar days only', () => {
    const entries = buildThreadEntries([
      view({ id: 'a', createdAt: at(2026, 1, 1, 9, 0) }),
      view({ id: 'b', createdAt: at(2026, 1, 1, 10, 0) }),
      view({ id: 'c', createdAt: at(2026, 1, 2, 9, 0) }),
    ]);

    expect(kinds(entries)).toEqual(['day', 'message', 'message', 'day', 'message']);
  });

  it('should continue a run by the same author within the window', () => {
    const entries = buildThreadEntries([
      view({ id: 'a', createdAt: at(2026, 1, 1, 9, 0) }),
      view({ id: 'b', createdAt: at(2026, 1, 1, 9, 1) }),
    ]);

    expect(continuations(entries)).toEqual([false, true]);
  });

  it('should break a run once the authors differ', () => {
    const entries = buildThreadEntries([
      view({ id: 'a', createdAt: at(2026, 1, 1, 9, 0) }),
      view({ id: 'b', authorId: 'member-2', createdAt: at(2026, 1, 1, 9, 1) }),
      view({ id: 'c', createdAt: at(2026, 1, 1, 9, 2) }),
    ]);

    expect(continuations(entries)).toEqual([false, false, false]);
  });

  it('should break a run that goes quiet for longer than the window', () => {
    const entries = buildThreadEntries([
      view({ id: 'a', createdAt: at(2026, 1, 1, 9, 0) }),
      view({ id: 'b', createdAt: at(2026, 1, 1, 9, 30) }),
    ]);

    // Two messages half an hour apart are not one thought.
    expect(continuations(entries)).toEqual([false, false]);
  });

  it('should start a new run after a day rule even for the same author', () => {
    const entries = buildThreadEntries([
      view({ id: 'a', createdAt: at(2026, 1, 1, 23, 59) }),
      view({ id: 'b', createdAt: at(2026, 1, 2, 0, 0, 30) }),
    ]);

    expect(continuations(entries)).toEqual([false, false]);
  });

  it('should still render a message with an unusable timestamp', () => {
    const entries = buildThreadEntries([view({ id: 'a', createdAt: 'not-a-date' })]);

    // Dropping it would lose a real message over a formatting problem.
    expect(kinds(entries)).toEqual(['message']);
    expect(continuations(entries)).toEqual([false]);
  });
});
