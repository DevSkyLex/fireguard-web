import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCw, lucideTriangleAlert } from '@ng-icons/lucide';
import type {
  MessageReactionToggle,
  MessageView,
} from '@features/organization/features/collaboration/models';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmBubble, HlmBubbleContent, type BubbleVariants } from '@shared/ui/bubble';
import { HlmButton } from '@shared/ui/button';
import {
  HlmMessage,
  HlmMessageAvatar,
  HlmMessageContent,
  HlmMessageFooter,
  HlmMessageHeader,
} from '@shared/ui/message';
import { MessageReactions } from '../message-reactions';

/**
 * Component MessageRow
 * @class MessageRow
 *
 * @description
 * One message in a conversation: the reader's own on the right, the
 * counterpart's on the left, with the author's name and time shown only when a
 * run of messages starts.
 *
 * The body is bound as HTML because the API stores it that way and the server
 * has already sanitized it against a fixed allow-list; Angular sanitizes it
 * again on binding. `whitespace-pre-wrap` is not cosmetic — a plain-text body
 * carries real newlines that HTML would otherwise collapse.
 *
 * A message that has not reached the server yet says so, and one that failed
 * offers to retry rather than disappearing: the row is the only place the
 * member can see that the message is still owed.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-row [message]="entry.message" [continuation]="entry.continuation" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-row',
  imports: [
    NgIcon,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmBubble,
    HlmBubbleContent,
    HlmButton,
    HlmMessage,
    HlmMessageAvatar,
    HlmMessageContent,
    HlmMessageFooter,
    HlmMessageHeader,
    MessageReactions,
  ],
  providers: [provideIcons({ lucideRotateCw, lucideTriangleAlert })],
  templateUrl: './message-row.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageRow {
  //#region Inputs
  /**
   * Property message
   * @readonly
   *
   * @description
   * The message to draw, already resolved and rendered by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MessageView>}
   */
  public readonly message: InputSignal<MessageView> = input.required<MessageView>();

  /**
   * Property continuation
   * @readonly
   *
   * @description
   * Whether this message carries on the previous author's run, in which case
   * the avatar and the name line are dropped.
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
   * Whether the reader may react to this message. Reacting is a write, which
   * reading a conversation does not grant.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReact: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property retried
   * @readonly
   *
   * @description
   * Emits the id of a message the member wants to send again.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly retried: OutputEmitterRef<string> = output<string>();

  /**
   * Property reactionToggled
   * @readonly
   *
   * @description
   * Emits the emoji the reader pressed on this message, whichever way it
   * points — the parent holds the tally and decides.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<MessageReactionToggle>}
   */
  public readonly reactionToggled: OutputEmitterRef<MessageReactionToggle> =
    output<MessageReactionToggle>();
  //#endregion

  //#region Properties
  /**
   * Property time
   * @readonly
   *
   * @description
   * The message's clock time in the active locale.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly time: Signal<string> = computed((): string => {
    const parsed: number = Date.parse(this.message().createdAt);

    if (Number.isNaN(parsed)) return '';

    return new Intl.DateTimeFormat(this.locale, { timeStyle: 'short' }).format(parsed);
  });

  /**
   * Property initials
   * @readonly
   *
   * @description
   * Fallback shown while an avatar image is missing or still loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly initials: Signal<string> = computed((): string =>
    this.message()
      .authorName.split(/\s+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  /**
   * Property deletedLabel
   * @readonly
   *
   * @description
   * Stands in for a tombstoned body, which the API redacts to nothing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly deletedLabel: string = $localize`:@@messages.row.deleted:This message was deleted`;

  /**
   * Property bubbleVariant
   * @readonly
   *
   * @description
   * Which spartan bubble variant carries the message's state: the reader's own
   * words, the counterpart's, or a tombstoned body drawn as an outline.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<BubbleVariants['variant']>}
   */
  protected readonly bubbleVariant: Signal<BubbleVariants['variant']> = computed(
    (): BubbleVariants['variant'] => {
      const entry: MessageView = this.message();

      if (entry.isDeleted) return 'outline';

      return entry.isOwn ? 'default' : 'muted';
    },
  );

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active locale, used to format the message's time.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);
  //#endregion
}
