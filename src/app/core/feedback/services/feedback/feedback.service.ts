import { Injectable, signal, type Signal, type WritableSignal } from '@angular/core';
import {
  type FeedbackEventPayload,
  type FeedbackSeverity,
  errorFeedback,
  infoFeedback,
  successFeedback,
  warnFeedback,
} from '@core/request-state';
import type { FeedbackMessage } from '../../models';

/**
 * Constant FEEDBACK_LIFE_MS
 *
 * @description
 * Auto-dismiss duration (ms) per severity. Errors linger longest so the user
 * has time to read the failure; successes are the most transient.
 *
 * @since 1.0.0
 */
const FEEDBACK_LIFE_MS: Readonly<Record<FeedbackSeverity, number>> = {
  success: 3500,
  info: 4000,
  warn: 6000,
  error: 8000,
};

/**
 * Service FeedbackService
 * @class FeedbackService
 *
 * @description
 * App-wide queue of user-facing feedback messages. It owns the message shape
 * (severity, suggested life, the `createdAt` timestamp used for a relative time
 * label) and exposes it as a signal, so any presentation layer can render the
 * queue without the producers knowing what that layer is.
 *
 * Stores remain the single trigger: they dispatch `FeedbackEventPayload`
 * events, the app-wide feedback listener (see `provideFeedback`) forwards them
 * to {@link show}. The convenience methods exist for the rare imperative case
 * (e.g. shell services without a store).
 *
 * The queue holds no timer. Auto-dismiss is a presentation decision, and a
 * `setTimeout` here would behave differently under SSR; {@link FeedbackMessage}
 * carries `lifeMs` so the consumer can honour it.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  //#region Properties
  /**
   * Property queue
   * @readonly
   *
   * @description
   * Backing store of the pending messages, oldest first.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {WritableSignal<readonly FeedbackMessage[]>}
   */
  private readonly queue: WritableSignal<readonly FeedbackMessage[]> = signal<
    readonly FeedbackMessage[]
  >([]);

  /**
   * Property nextId
   *
   * @description
   * Monotonic counter behind {@link FeedbackMessage.id}.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {number}
   */
  private nextId: number = 0;

  /**
   * Property messages
   * @readonly
   *
   * @description
   * Pending messages, oldest first, for the presentation layer to render.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<readonly FeedbackMessage[]>}
   */
  public readonly messages: Signal<readonly FeedbackMessage[]> = this.queue.asReadonly();
  //#endregion

  //#region Methods
  /**
   * Method show
   * @method show
   *
   * @description
   * Queues a message from a `FeedbackEventPayload`. When the payload carries a
   * `summary`, it becomes the primary line and `message` the secondary detail;
   * otherwise `message` is the single line.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FeedbackEventPayload} payload The feedback to display.
   *
   * @return {void}
   */
  public show(payload: FeedbackEventPayload): void {
    const message: FeedbackMessage = {
      id: this.nextId++,
      severity: payload.severity,
      summary: payload.summary ?? payload.message,
      detail: payload.summary ? payload.message : undefined,
      lifeMs: FEEDBACK_LIFE_MS[payload.severity],
      createdAt: payload.timestamp,
    };

    this.queue.update((queued) => [...queued, message]);
  }

  /**
   * Method dismiss
   * @method dismiss
   *
   * @description
   * Removes one message from the queue, by id.
   *
   * @access public
   * @since 2.0.0
   *
   * @param {number} id Identifier of the message to remove.
   *
   * @return {void}
   */
  public dismiss(id: number): void {
    this.queue.update((queued) => queued.filter((message) => message.id !== id));
  }

  /**
   * Method success
   * @method success
   *
   * @description
   * Convenience helper showing a success toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} message The already-localized success message.
   * @param {string} [summary] Optional bold title.
   *
   * @return {void}
   */
  public success(message: string, summary?: string): void {
    this.show(successFeedback(message, summary));
  }

  /**
   * Method info
   * @method info
   *
   * @description
   * Convenience helper showing an info toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} message The already-localized info message.
   * @param {string} [summary] Optional bold title.
   *
   * @return {void}
   */
  public info(message: string, summary?: string): void {
    this.show(infoFeedback(message, summary));
  }

  /**
   * Method warn
   * @method warn
   *
   * @description
   * Convenience helper showing a warning toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} message The already-localized warning message.
   * @param {string} [summary] Optional bold title.
   *
   * @return {void}
   */
  public warn(message: string, summary?: string): void {
    this.show(warnFeedback(message, summary));
  }

  /**
   * Method error
   * @method error
   *
   * @description
   * Convenience helper showing an error toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} message The already-localized error message.
   * @param {string} [summary] Optional bold title.
   *
   * @return {void}
   */
  public error(message: string, summary?: string): void {
    this.show(errorFeedback(message, { summary }));
  }

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Empties the queue.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public clear(): void {
    this.queue.set([]);
  }
  //#endregion
}
