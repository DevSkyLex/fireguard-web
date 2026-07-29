import type {
  MessageOutput,
  ThreadEntry,
} from '@features/organization/features/collaboration/models';

/**
 * Window within which two messages from the same author are treated as one
 * run, in milliseconds. Beyond it the author header reappears, because a reply
 * an hour later reads as a new turn rather than a continuation.
 */
const CONTINUATION_WINDOW_MS = 5 * 60 * 1000;

/**
 * The instant's calendar day in the reader's timezone, as `YYYY-MM-DD`.
 *
 * `toISOString()` cannot be used here: it would answer in UTC, which puts a
 * late-evening message on the next day for anyone east of Greenwich.
 */
function toLocalDay(date: Date): string {
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Function groupThreadMessages
 * @function groupThreadMessages
 *
 * @description
 * Turns a flat, oldest-first message list into the sequence a thread renders:
 * a separator whenever the day changes, and a `continuation` flag on messages
 * that carry on the previous author's run.
 *
 * A run breaks on a new author, a new day, a gap wider than five minutes, or a
 * tombstone — a deleted message should never be absorbed into someone's run.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly MessageOutput[]} messages - Messages, oldest first.
 *
 * @returns {readonly ThreadEntry[]} Separators and messages in render order.
 */
export function groupThreadMessages(messages: readonly MessageOutput[]): readonly ThreadEntry[] {
  const entries: ThreadEntry[] = [];
  let previousDay: string | null = null;
  let previousAuthor: string | null = null;
  let previousAt = 0;

  for (const message of messages) {
    const timestamp: number = Date.parse(message.createdAt);
    // `createdAt` carries a numeric offset, so the calendar day has to come
    // from the parsed instant — and from its *local* parts, so the run breaks
    // where the reader sees the date change rather than where UTC does.
    const day: string = Number.isNaN(timestamp)
      ? message.createdAt
      : toLocalDay(new Date(timestamp));

    const dayChanged: boolean = day !== previousDay;

    if (dayChanged) {
      entries.push({ kind: 'day', day, at: message.createdAt });
    }

    const continuation: boolean =
      !dayChanged &&
      !message.isDeleted &&
      message.authorMember === previousAuthor &&
      timestamp - previousAt <= CONTINUATION_WINDOW_MS;

    entries.push({ kind: 'message', message, continuation });

    previousDay = day;
    previousAuthor = message.isDeleted ? null : message.authorMember;
    previousAt = Number.isNaN(timestamp) ? previousAt : timestamp;
  }

  return entries;
}
