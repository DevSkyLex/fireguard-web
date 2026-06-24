import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  type FeedbackEventPayload,
  type FeedbackSeverity,
  errorFeedback,
  infoFeedback,
  successFeedback,
  warnFeedback,
} from '@core/request-state';

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
 * App-wide facade over PrimeNG's `MessageService` for user-facing feedback
 * toasts. It centralizes the toast shape (severity, life, the `createdAt`
 * timestamp used for the relative time label) so callers never assemble a
 * `MessageService.add({...})` object by hand.
 *
 * Stores remain the single trigger: they dispatch `FeedbackEventPayload`
 * events, the app-wide feedback listener (see `provideFeedback`) forwards them
 * to {@link show}. The convenience methods exist for the rare imperative case
 * (e.g. shell services without a store).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  //#region Properties
  /**
   * Property messages
   * @readonly
   *
   * @description
   * PrimeNG message service backing the application toast outlet.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messages: MessageService = inject<MessageService>(MessageService);
  //#endregion

  //#region Methods
  /**
   * Method show
   * @method show
   *
   * @description
   * Renders a toast from a `FeedbackEventPayload`. When the payload carries a
   * `summary`, it becomes the bold title and `message` the secondary detail;
   * otherwise `message` is shown as the single bold line.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FeedbackEventPayload} payload The feedback to display.
   *
   * @return {void}
   */
  public show(payload: FeedbackEventPayload): void {
    this.messages.add({
      severity: payload.severity,
      summary: payload.summary ?? payload.message,
      detail: payload.summary ? payload.message : undefined,
      life: FEEDBACK_LIFE_MS[payload.severity],
      data: { createdAt: payload.timestamp, severity: payload.severity },
    });
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
   * Dismisses all currently visible toasts.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public clear(): void {
    this.messages.clear();
  }
  //#endregion
}
