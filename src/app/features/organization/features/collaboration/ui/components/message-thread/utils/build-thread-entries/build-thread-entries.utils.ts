import type {
  MessageThreadEntry,
  MessageView,
} from '@features/organization/features/collaboration/models';

/**
 * How long a run of messages by one author stays a run.
 *
 * Past this, the next message gets its own name and time even though nobody
 * else spoke — two messages an hour apart are not one thought.
 */
const RUN_WINDOW_MS = 5 * 60 * 1000;

/**
 * The local calendar day of an instant, as a stable key.
 *
 * Built from the local parts rather than `toISOString`, which would report the
 * UTC day and put the rule in the wrong place for anyone east or west of it.
 */
function localDayOf(date: Date): string {
  const month: string = `${date.getMonth() + 1}`.padStart(2, '0');
  const day: string = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Function buildThreadEntries
 * @function buildThreadEntries
 *
 * @description
 * Turns an ordered list of messages into what the thread draws: a date rule
 * wherever the calendar day changes, and each message marked as continuing the
 * previous author's run or starting a new one.
 *
 * A message with an unparseable timestamp still renders — it simply starts a
 * new run and gets no rule of its own, which is better than dropping it.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly MessageView[]} messages - Messages in chronological order.
 *
 * @returns {readonly MessageThreadEntry[]} Entries in render order.
 *
 * @example
 * ```typescript
 * buildThreadEntries([first, second]);
 * // [{ kind: 'day', … }, { kind: 'message', continuation: false, … }, …]
 * ```
 */
export function buildThreadEntries(
  messages: readonly MessageView[],
): readonly MessageThreadEntry[] {
  const entries: MessageThreadEntry[] = [];

  let previousDay: string | null = null;
  let previousAuthorId: string | null = null;
  let previousAt: number | null = null;

  for (const message of messages) {
    const parsed: number = Date.parse(message.createdAt);
    const isDated: boolean = !Number.isNaN(parsed);
    const day: string | null = isDated ? localDayOf(new Date(parsed)) : null;

    if (day !== null && day !== previousDay) {
      entries.push({ kind: 'day', day, at: message.createdAt });
      previousDay = day;
      previousAuthorId = null;
      previousAt = null;
    }

    const continuation: boolean =
      isDated &&
      previousAuthorId === message.authorId &&
      previousAt !== null &&
      parsed - previousAt <= RUN_WINDOW_MS;

    entries.push({ kind: 'message', message, continuation });

    previousAuthorId = message.authorId;
    previousAt = isDated ? parsed : null;
  }

  return entries;
}
