import type { MessageRowEntry } from '@features/organization/features/collaboration/models';

/**
 * Type MessageThreadRenderGroup
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
 *
 * @type MessageThreadRenderGroup
 * @type
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
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the message thread day group variant represented by this value.
   *
   * @access public
   *
   * @type {'day'}
   */
  readonly kind: 'day';

  /**
   * Property day
   * @readonly
   *
   * @description
   * Local `YYYY-MM-DD`. A tracking key, never a display value.
   *
   * @access public
   *
   * @type {string}
   */
  readonly day: string;

  /**
   * Property at
   * @readonly
   *
   * @description
   * The day's first message instant — what actually gets formatted.
   *
   * @access public
   *
   * @type {string}
   */
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
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the message thread run group variant represented by this value.
   *
   * @access public
   *
   * @type {'run'}
   */
  readonly kind: 'run';

  /**
   * Property key
   * @readonly
   *
   * @description
   * The first message's id in the run — stable across re-renders.
   *
   * @access public
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Contains the message rows grouped together for rendering.
   *
   * @access public
   *
   * @type {readonly MessageRowEntry[]}
   */
  readonly entries: readonly MessageRowEntry[];
}
