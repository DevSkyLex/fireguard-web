import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { deriveInitials } from '@shared/initials';
import type { ChatMessageContext, ChatMessageItem } from '../../models';
import { chatBodyToText } from '../../utils';
import { ChatAttachmentList } from '../chat-attachment-list';
import { ChatMessageActions } from '../chat-message-actions';
import { ChatMessageBody } from '../chat-message-body';
import { ChatReactionList } from '../chat-reaction-list';

/**
 * Emoji offered directly in a message's action bar.
 *
 * A default, not a rule — a consumer with its own vocabulary overrides it.
 */
const DEFAULT_QUICK_REACTIONS: readonly string[] = ['👍', '✅', '👀', '🔥'];

/**
 * Component ChatMessage
 * @class ChatMessage
 *
 * @description
 * One message in a conversation: avatar, author line, body, attachments,
 * reactions, and an action bar.
 *
 * Presentational — it injects nothing and calls nothing. Everything it draws
 * comes from one {@link ChatMessageItem}, whose `bodyHtml` is already rendered
 * and whose `data` it never looks inside: content only the consumer
 * understands arrives through an `appChatMessageExtra` template.
 *
 * `group` on the host is load-bearing: the action bar reveals itself with
 * `lg:group-hover:` / `lg:group-focus-within:` variants that resolve against
 * it.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-chat-message [message]="message" (reacted)="react(message.id, $event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-chat-message',
  imports: [
    AvatarModule,
    ChatAttachmentList,
    ChatMessageActions,
    ChatMessageBody,
    ChatReactionList,
    DatePipe,
    NgTemplateOutlet,
  ],
  templateUrl: './chat-message.component.html',
  host: { class: 'group relative flex gap-3 max-lg:flex-wrap' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessage<TData = unknown> {
  //#region Inputs
  /**
   * Property message
   * @readonly
   *
   * @description
   * The message to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ChatMessageItem<TData>>}
   */
  public readonly message: InputSignal<ChatMessageItem<TData>> =
    input.required<ChatMessageItem<TData>>();

  /**
   * Property continuation
   * @readonly
   *
   * @description
   * Whether this message carries on the previous author's run, which drops the
   * author line and holds the avatar column open so bodies stay aligned.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly continuation: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canReact
   * @readonly
   *
   * @description
   * Whether reacting is offered. Off on surfaces that cannot act on it: a
   * focusable control that silently does nothing is worse than none.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReact: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canPin
   * @readonly
   *
   * @description
   * Whether pinning is offered.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canPin: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canSave
   * @readonly
   *
   * @description
   * Whether bookmarking is offered.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canSave: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canReply
   * @readonly
   *
   * @description
   * Whether this surface can open a reply thread. Also gates the reply count,
   * which would otherwise be a number that opens nothing.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReply: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canCopy
   * @readonly
   *
   * @description
   * Whether the message text can be copied.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canCopy: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canMarkRead
   * @readonly
   *
   * @description
   * Whether this surface can move a read marker to a message. Off by default:
   * most surfaces have no marker to move.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canMarkRead: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canDelete
   * @readonly
   *
   * @description
   * Whether this surface offers deletion at all — a veto over the message's own
   * `canDelete`, never a grant.
   *
   * Both are needed: the message says whether the *reader* may delete it, this
   * says whether the *surface* can act on that. A reply panel's root message
   * answers yes to the first and no to the second, because deleting it is not
   * something that panel does.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canDelete: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property quickReactions
   * @readonly
   *
   * @description
   * Emoji offered directly in the action bar.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly quickReactions: InputSignal<readonly string[]> =
    input<readonly string[]>(DEFAULT_QUICK_REACTIONS);

  /**
   * Property extraTemplate
   * @readonly
   *
   * @description
   * A consumer's block, rendered under the body with the message as context.
   *
   * Passed in rather than captured here: `contentChild` does not reach across a
   * component boundary, so a thread that owns the projected template has to
   * hand it down.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<TemplateRef<ChatMessageContext<TData>> | null>}
   */
  public readonly extraTemplate: InputSignal<TemplateRef<ChatMessageContext<TData>> | null> =
    input<TemplateRef<ChatMessageContext<TData>> | null>(null);
  //#endregion

  //#region Outputs
  /** Emits the emoji the reader reacted with. */
  public readonly reacted: OutputEmitterRef<string> = output<string>();
  /** Emits the emoji whose reaction the reader is taking back. */
  public readonly reactionRemoved: OutputEmitterRef<string> = output<string>();
  /** Emits when the bookmark is toggled. */
  public readonly saveToggled: OutputEmitterRef<void> = output<void>();
  /** Emits when the pin is toggled; the message's `isPinned` gives the direction. */
  public readonly pinToggled: OutputEmitterRef<void> = output<void>();
  /** Emits when the reader wants this message's reply thread. */
  public readonly replied: OutputEmitterRef<void> = output<void>();
  /** Emits the message as plain text, for the consumer to put on the clipboard. */
  public readonly copied: OutputEmitterRef<string> = output<string>();
  /** Emits when the reader wants the conversation marked read up to this message. */
  public readonly markedRead: OutputEmitterRef<void> = output<void>();
  /** Emits when the reader asks to delete this message. Confirming is the consumer's job. */
  public readonly deleted: OutputEmitterRef<void> = output<void>();
  /** Emits when a failed message should be sent again. */
  public readonly retried: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property initials
   * @readonly
   *
   * @description
   * Fallback avatar label, for an author with no picture.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly initials: Signal<string> = computed((): string =>
    deriveInitials(this.message().authorName),
  );

  /**
   * Property extraContext
   * @readonly
   *
   * @description
   * Context for the projected template, so `let-message` narrows to this row's
   * message.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChatMessageContext<TData>>}
   */
  protected readonly extraContext: Signal<ChatMessageContext<TData>> = computed(
    (): ChatMessageContext<TData> => ({ $implicit: this.message() }),
  );
  //#endregion

  //#region Methods
  /**
   * Method copy
   * @method copy
   *
   * @description
   * Emits the body as plain text. The flattening happens here because the
   * rendered HTML is what this component owns; writing to the clipboard, and
   * telling the reader it worked, is the consumer's.
   *
   * @access protected
   * @since 2.0.0
   *
   * @return {void}
   */
  protected copy(): void {
    this.copied.emit(chatBodyToText(this.message().bodyHtml));
  }
  //#endregion
}
