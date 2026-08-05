import type { FeedbackSeverity } from '@core/request-state';

/**
 * Interface FeedbackMessage
 * @interface FeedbackMessage
 *
 * @description
 * One queued user-facing message, ready to be rendered by whatever presentation
 * layer consumes the feedback queue.
 *
 * `lifeMs` is carried as data rather than enforced by a timer: the queue holds
 * no `setTimeout`, so it behaves identically on the server and in the browser,
 * and the consumer decides when a message expires.
 *
 * @since 2.0.0
 */
export interface FeedbackMessage {
  //#region Properties

  /**
   * Property id
   *
   * @description
   * Monotonic identifier, unique per application instance. Used to dismiss a
   * single message without ambiguity.
   *
   * @type {number}
   */
  readonly id: number;

  /**
   * Property severity
   *
   * @description
   * Severity of the message.
   *
   * @type {FeedbackSeverity}
   */
  readonly severity: FeedbackSeverity;

  /**
   * Property summary
   *
   * @description
   * Primary already-localized line.
   *
   * @type {string}
   */
  readonly summary: string;

  /**
   * Property detail
   *
   * @description
   * Optional secondary line, present only when the source payload carried both
   * a summary and a message.
   *
   * @type {string | undefined}
   */
  readonly detail?: string;

  /**
   * Property lifeMs
   *
   * @description
   * Suggested display duration in milliseconds, derived from the severity.
   *
   * @type {number}
   */
  readonly lifeMs: number;

  /**
   * Property createdAt
   *
   * @description
   * Unix timestamp (ms) at which the source feedback was produced.
   *
   * @type {number}
   */
  readonly createdAt: number;

  //#endregion
}
