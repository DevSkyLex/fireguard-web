import {
  ChangeDetectionStrategy,
  Component,
  effect,
  EffectRef,
  inject,
  untracked,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { FeedbackService, type FeedbackMessage } from '@core/feedback';
import {
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
} from '@core/interaction-capabilities';
import { HlmToaster } from '@shared/ui/sonner';

/**
 * Component App
 * @class App
 *
 * @description
 * Hosts the routed application and drains app-wide feedback into Spartan's
 * native toaster.
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
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  //#region Properties
  /**
   * Property interactionCapabilities
   * @readonly
   * @description Keeps notifications clear of mobile navigation and workflow footers.
   * @access protected
   * @since 3.1.0
   * @type {InteractionCapabilitiesPort}
   */
  protected readonly interactionCapabilities: InteractionCapabilitiesPort = inject(
    INTERACTION_CAPABILITIES_PORT,
  );

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
   * Renders and dismisses pending feedback. Queue writes stay untracked so they
   * do not become effect dependencies.
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
   * Maps one feedback message to its matching Sonner severity and lifetime.
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
