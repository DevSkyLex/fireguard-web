import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { ChatAttachment } from '../../models';

/**
 * Component ChatAttachmentList
 * @class ChatAttachmentList
 *
 * @description
 * The files carried by a message, named.
 *
 * Names only, and no link: a download route may be bearer-authenticated or
 * force a `Content-Disposition`, which the owning feature knows and a chat row
 * does not. A consumer that can serve its files puts the affordance in its
 * `appChatMessageExtra` template.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-chat-attachment-list [attachments]="message.attachments" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-chat-attachment-list',
  imports: [],
  templateUrl: './chat-attachment-list.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAttachmentList {
  //#region Inputs
  /**
   * Property attachments
   * @readonly
   *
   * @description
   * Files to name.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChatAttachment[]>}
   */
  public readonly attachments: InputSignal<readonly ChatAttachment[]> = input<
    readonly ChatAttachment[]
  >([]);
  //#endregion
}
