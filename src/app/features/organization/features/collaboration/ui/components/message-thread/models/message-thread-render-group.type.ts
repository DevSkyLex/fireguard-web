import type { MessageRowEntry } from '@features/organization/features/collaboration/models';

/**
 * Type MessageThreadRenderGroup
 * @typedef MessageThreadRenderGroup
 *
 * @description
 * What the thread actually draws, one level above {@link MessageThreadEntry}: a
 * date rule, or a run of one author's messages sharing a single
 * `hlmMessageGroup`. Local to {@link MessageThread} — nothing outside the
 * component's own rendering needs the grouped shape.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type MessageThreadRenderGroup = MessageThreadDayGroup | MessageThreadRunGroup;

/**
 * Interface MessageThreadDayGroup
 * @interface MessageThreadDayGroup
 *
 * @description
 * The rule marking where the calendar day changes.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageThreadDayGroup {
  readonly kind: 'day';
  /** Local `YYYY-MM-DD`. A tracking key, never a display value. */
  readonly day: string;
  /** The day's first message instant — what actually gets formatted. */
  readonly at: string;
}

/**
 * Interface MessageThreadRunGroup
 * @interface MessageThreadRunGroup
 *
 * @description
 * One or more consecutive messages by the same author, drawn inside one
 * `hlmMessageGroup` so spartan owns the rhythm between them.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageThreadRunGroup {
  readonly kind: 'run';
  /** The first message's id in the run — stable across re-renders. */
  readonly key: string;
  readonly entries: readonly MessageRowEntry[];
}
