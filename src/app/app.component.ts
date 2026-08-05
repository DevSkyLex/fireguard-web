import { ChangeDetectionStrategy, Component, effect, EffectRef, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { FeedbackService, type FeedbackMessage } from '@core/feedback';
import { HlmToaster } from '@shared/ui/sonner';

/**
 * Component App
 * @class App
 *
 * @description
 * Root application component: the routed outlet and the app-wide toast deck.
 *
 * The deck is spartan's own `hlm-toaster`, rendered directly — wrapping it in a
 * component of ours would rename it and nothing more (`ARCHITECTURE.md` §8.5).
 * What is left here is the part spartan cannot know: draining the feedback
 * queue into it. That belongs to the shell rather than to `shared`, because it
 * knows a `core` concern and is not a generic primitive (§6.4).
 *
 * @version 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <!-- Used in main.ts as the bootstrap component -->
 * <app-root></app-root>
 * ```
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToaster],
  template: `<router-outlet /> <hlm-toaster />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  //#region Properties
  /**
   * Property feedback
   * @readonly
   *
   * @description
   * The app-wide message queue, filled by the stores through `provideFeedback()`.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);
  //#endregion

  //#region Lifecycle
  /**
   * Property drain
   * @readonly
   *
   * @description
   * Hands every queued message to the deck and drops it, so the queue stays a
   * handover buffer rather than a growing log. Dismissing inside `untracked`
   * keeps the write out of the effect's own dependencies, which would otherwise
   * re-run it forever.
   *
   * @access private
   * @since 3.0.0
   */
  private readonly drain: EffectRef = effect((): void => {
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
   * not merely a differently worded success. The queue holds no timer — the
   * message carries `lifeMs` and honouring it is a presentation decision.
   *
   * @access private
   * @since 3.0.0
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
