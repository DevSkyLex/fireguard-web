import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { FEEDBACK_PORT, type FeedbackMessage, type FeedbackPort } from '@core/feedback';
import { HlmToaster } from '@shared/ui/sonner';

/**
 * Component ToastDeck
 * @class ToastDeck
 *
 * @description
 * The presentation of the app-wide feedback queue. It drains
 * {@link FeedbackPort} into spartan's sonner deck: every message the queue
 * receives becomes one toast and is then dropped, so the queue stays a handover
 * buffer rather than a growing log.
 *
 * Mounted once at the shell root. The queue itself holds no timer — auto-dismiss
 * is a presentation decision, which is why the message's `lifeMs` is applied
 * here and not in `core` (`ARCHITECTURE.md` §8.1).
 *
 * It reads the port rather than `FeedbackService`, so `shared` stays free of a
 * concrete core implementation (§8.5).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-toast-deck />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-toast-deck',
  imports: [HlmToaster],
  template: `<hlm-toaster />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastDeck {
  //#region Properties
  /**
   * Property feedback
   * @readonly
   *
   * @description
   * The queue this deck renders.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FeedbackPort}
   */
  private readonly feedback: FeedbackPort = inject<FeedbackPort>(FEEDBACK_PORT);
  //#endregion

  //#region Lifecycle
  /**
   * Property drain
   * @readonly
   *
   * @description
   * Hands every queued message to sonner and drops it. Dismissing inside
   * `untracked` keeps the write out of the effect's own dependencies, which
   * would otherwise re-run it forever.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly drain = effect((): void => {
    const pending: readonly FeedbackMessage[] = this.feedback.messages();
    if (pending.length === 0) return;

    untracked((): void => {
      for (const message of pending) {
        this.render(message);
        this.feedback.dismiss(message.id);
      }
    });
  });
  //#endregion

  //#region Internals
  /**
   * Method render
   * @method render
   *
   * @description
   * Shows one message with the severity's own sonner variant, so an error is
   * not merely a differently worded success.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {FeedbackMessage} message - The message to show.
   *
   * @returns {void}
   */
  private render(message: FeedbackMessage): void {
    const options = { description: message.detail, duration: message.lifeMs };

    switch (message.severity) {
      case 'success':
        toast.success(message.summary, options);
        break;
      case 'warn':
        toast.warning(message.summary, options);
        break;
      case 'error':
        toast.error(message.summary, options);
        break;
      default:
        toast.info(message.summary, options);
    }
  }
  //#endregion
}
