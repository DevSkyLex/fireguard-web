import type { MessageView } from './message-view.interface';

/**
 * Type MessageThreadEntry
 * @typedef MessageThreadEntry
 *
 * @description
 * One thing a thread draws, in render order: either a date rule or a message.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type MessageThreadEntry = MessageDayEntry | MessageRowEntry;

/**
 * Interface MessageDayEntry
 * @interface MessageDayEntry
 *
 * @description
 * The rule marking where the calendar day changes.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageDayEntry {
  readonly kind: 'day';
  /** Local `YYYY-MM-DD`. A tracking key, never a display value. */
  readonly day: string;
  /** The day's first message instant — what actually gets formatted. */
  readonly at: string;
}

/**
 * Interface MessageRowEntry
 * @interface MessageRowEntry
 *
 * @description
 * A message, plus whether it carries on the previous author's run.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageRowEntry {
  readonly kind: 'message';
  readonly message: MessageView;
  readonly continuation: boolean;
}
