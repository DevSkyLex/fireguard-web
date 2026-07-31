import type { ChatEntry, ChatMessageItem } from '../models';

/**
 * Default window within which two messages from the same author read as one
 * run, in milliseconds.
 *
 * A product decision rather than a rendering constant, which is why callers can
 * override it: five minutes suits a workplace channel, and suits a support
 * inbox rather less.
 */
const DEFAULT_CONTINUATION_WINDOW_MS = 5 * 60 * 1000;

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
 * Function groupChatEntries
 * @function groupChatEntries
 *
 * @description
 * Turns a flat, oldest-first message list into the sequence a conversation
 * renders: a separator whenever the day changes, and a `continuation` flag on
 * messages that carry on the previous author's run.
 *
 * A run breaks on a new author, a new day, a gap wider than the window, or a
 * deleted message — a tombstone should never be absorbed into someone's run.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly ChatMessageItem<TData>[]} messages - Messages, oldest first.
 * @param {number} continuationWindowMs - How long a run may pause before it breaks.
 *
 * @returns {readonly ChatEntry<TData>[]} Separators and messages in render order.
 *
 * @example
 * ```typescript
 * groupChatEntries(messages);
 * ```
 */
export function groupChatEntries<TData>(
  messages: readonly ChatMessageItem<TData>[],
  continuationWindowMs: number = DEFAULT_CONTINUATION_WINDOW_MS,
): readonly ChatEntry<TData>[] {
  const entries: ChatEntry<TData>[] = [];
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
      message.authorId === previousAuthor &&
      timestamp - previousAt <= continuationWindowMs;

    entries.push({ kind: 'message', message, continuation });

    previousDay = day;
    previousAuthor = message.isDeleted ? null : message.authorId;
    previousAt = Number.isNaN(timestamp) ? previousAt : timestamp;
  }

  return entries;
}
