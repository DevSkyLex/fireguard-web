import type { MessageOutput } from '@features/collaboration/models';

/**
 * Interface ThreadEntry
 * @interface ThreadEntry
 *
 * @description
 * One item in a rendered thread: either a day separator, or a message that
 * knows whether it continues the previous author's run.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type ThreadEntry = ThreadDaySeparator | ThreadMessageEntry;

/**
 * Interface ThreadDaySeparator
 * @interface ThreadDaySeparator
 *
 * @description
 * Marks the start of a new calendar day in the thread.
 *
 * @since 1.0.0
 */
export interface ThreadDaySeparator {
  readonly kind: 'day';
  /** Local calendar day, `YYYY-MM-DD`. A stable key, not a display value. */
  readonly day: string;
  /**
   * `createdAt` of the day's first message, which is what the separator
   * renders. Formatting the instant rather than {@link day} keeps the label in
   * the same timezone as the times printed under it.
   */
  readonly at: string;
}

/**
 * Interface ThreadMessageEntry
 * @interface ThreadMessageEntry
 *
 * @description
 * A message, plus whether it should render its author header.
 *
 * @since 1.0.0
 */
export interface ThreadMessageEntry {
  readonly kind: 'message';
  readonly message: MessageOutput;
  /**
   * Whether this message continues the previous one from the same author on
   * the same day, in which case the avatar and author line are suppressed.
   */
  readonly continuation: boolean;
}
