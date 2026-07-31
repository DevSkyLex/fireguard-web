import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component ChatMessageBody
 * @class ChatMessageBody
 *
 * @description
 * Renders one message's rich text.
 *
 * It takes HTML that is **already rendered** and trusted, and does nothing but
 * bind it under a rich-text skin. Whatever a message body is made of — mention
 * chips, a server's sanitizer conventions, a Markdown pass — belongs to
 * whoever owns those messages; this component would otherwise inherit one
 * backend's serialization quirks and stop being generic.
 *
 * Angular sanitizes the binding, so a caller that hands over untrusted HTML
 * still cannot inject script or event handlers — but the caller is responsible
 * for the content being what it means.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-chat-message-body [bodyHtml]="message.bodyHtml" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-chat-message-body',
  imports: [],
  templateUrl: './chat-message-body.component.html',
  host: {
    class:
      'block max-w-[64ch] text-base leading-normal wrap-anywhere text-pretty text-surface-900 dark:text-surface-100',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageBody {
  //#region Inputs
  /**
   * Property bodyHtml
   * @readonly
   *
   * @description
   * The message's rendered HTML. Empty for a message with no body — a deleted
   * one, typically, whose placeholder the caller renders instead.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly bodyHtml: InputSignal<string> = input<string>('');
  //#endregion
}
