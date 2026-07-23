import type { MessageOutput, ThreadEntry, ThreadMessageEntry } from '../../models';
import { groupThreadMessages } from '../group-thread-messages.utils';

/**
 * Builds a message with only the fields the grouping actually reads, so a
 * contract change elsewhere does not drag these cases with it.
 */
function message(
  id: string,
  authorMember: string,
  createdAt: string,
  isDeleted = false,
): MessageOutput {
  return {
    '@id': `/api/messages/${id}`,
    '@type': 'Message',
    id,
    conversation: '/api/conversations/c1',
    authorMember,
    body: 'hello',
    mentions: [],
    mentionNames: {},
    isDeleted,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt,
    updatedAt: createdAt,
  };
}

/** The local calendar day of an instant, matching what the util keys on. */
function localDay(createdAt: string): string {
  const date = new Date(createdAt);
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Keeps assertions on the message stream readable. */
function messageEntries(entries: readonly ThreadEntry[]): readonly ThreadMessageEntry[] {
  return entries.filter((entry): entry is ThreadMessageEntry => entry.kind === 'message');
}

describe('groupThreadMessages', () => {
  it('should return nothing for an empty thread', () => {
    expect(groupThreadMessages([])).toEqual([]);
  });

  it('should open the thread with a day separator carrying the first instant', () => {
    const entries = groupThreadMessages([message('1', '/m/a', '2026-07-20T09:00:00+00:00')]);

    // `at` is what renders, so the label sits in the same timezone as the
    // times printed under it; `day` is only the grouping key.
    expect(entries[0]).toEqual({
      kind: 'day',
      day: localDay('2026-07-20T09:00:00+00:00'),
      at: '2026-07-20T09:00:00+00:00',
    });
    expect(entries).toHaveLength(2);
  });

  it('should mark a quick follow-up from the same author as a continuation', () => {
    const entries = messageEntries(
      groupThreadMessages([
        message('1', '/m/a', '2026-07-20T09:00:00+00:00'),
        message('2', '/m/a', '2026-07-20T09:02:00+00:00'),
      ]),
    );

    expect(entries.map((entry) => entry.continuation)).toEqual([false, true]);
  });

  it('should break the run when the author changes', () => {
    const entries = messageEntries(
      groupThreadMessages([
        message('1', '/m/a', '2026-07-20T09:00:00+00:00'),
        message('2', '/m/b', '2026-07-20T09:01:00+00:00'),
        message('3', '/m/a', '2026-07-20T09:02:00+00:00'),
      ]),
    );

    expect(entries.map((entry) => entry.continuation)).toEqual([false, false, false]);
  });

  it('should break the run past the five-minute window', () => {
    const entries = messageEntries(
      groupThreadMessages([
        message('1', '/m/a', '2026-07-20T09:00:00+00:00'),
        message('2', '/m/a', '2026-07-20T09:05:00+00:00'),
        message('3', '/m/a', '2026-07-20T09:10:01+00:00'),
      ]),
    );

    // Exactly five minutes still counts; one second past it does not.
    expect(entries.map((entry) => entry.continuation)).toEqual([false, true, false]);
  });

  it('should emit a separator and break the run on a new day', () => {
    // Local noon on two consecutive days, whatever the runner's timezone.
    const first = new Date(2026, 6, 20, 12).toISOString();
    const second = new Date(2026, 6, 21, 12).toISOString();
    const entries = groupThreadMessages([
      message('1', '/m/a', first),
      message('2', '/m/a', second),
    ]);

    expect(entries.filter((entry) => entry.kind === 'day')).toHaveLength(2);
    expect(messageEntries(entries).map((entry) => entry.continuation)).toEqual([false, false]);
  });

  it('should resolve the day from the instant rather than the raw offset', () => {
    // The same moment written two ways must not split into two days.
    const entries = groupThreadMessages([
      message('1', '/m/a', '2026-07-20T23:30:00+00:00'),
      message('2', '/m/a', '2026-07-21T01:30:00+02:00'),
    ]);

    expect(entries.filter((entry) => entry.kind === 'day')).toHaveLength(1);
  });

  it('should group by the local day, not the UTC one', () => {
    // Local 23:30 and 00:30 are one hour apart yet belong to different days,
    // whichever timezone the reader is in.
    const entries = groupThreadMessages([
      message('1', '/m/a', new Date(2026, 6, 20, 23, 30).toISOString()),
      message('2', '/m/a', new Date(2026, 6, 21, 0, 30).toISOString()),
    ]);

    expect(entries.filter((entry) => entry.kind === 'day')).toHaveLength(2);
  });

  it('should never absorb a tombstone into a run, nor continue one after it', () => {
    const entries = messageEntries(
      groupThreadMessages([
        message('1', '/m/a', '2026-07-20T09:00:00+00:00'),
        message('2', '/m/a', '2026-07-20T09:01:00+00:00', true),
        message('3', '/m/a', '2026-07-20T09:02:00+00:00'),
      ]),
    );

    expect(entries.map((entry) => entry.continuation)).toEqual([false, false, false]);
  });

  it('should fall back to the raw timestamp when it cannot be parsed', () => {
    const entries = groupThreadMessages([message('1', '/m/a', 'not-a-date')]);

    expect(entries[0]).toEqual({ kind: 'day', day: 'not-a-date', at: 'not-a-date' });
  });
});
