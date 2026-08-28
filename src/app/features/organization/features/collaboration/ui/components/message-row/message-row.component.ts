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
import {
  lucideBookmark,
  lucideBookmarkX,
  lucideEllipsis,
  lucideMessageSquareReply,
  lucidePencilLine,
  lucidePin,
  lucidePinOff,
  lucideRotateCw,
  lucideTrash2,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type {
  MessageReactionToggle,
  MessageView,
} from '@features/organization/features/collaboration/models';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmBubble, HlmBubbleContent, type BubbleVariants } from '@shared/ui/bubble';
import { HlmButton } from '@shared/ui/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuGroup,
  HlmDropdownMenuItem,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
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
    HlmDropdownMenu,
    HlmDropdownMenuGroup,
    HlmDropdownMenuItem,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuTrigger,
    HlmMessage,
    HlmMessageAvatar,
    HlmMessageContent,
    HlmMessageFooter,
    HlmMessageHeader,
    MessageReactions,
  ],
  providers: [
    provideIcons({
      lucideBookmark,
      lucideBookmarkX,
      lucideEllipsis,
      lucideMessageSquareReply,
      lucidePencilLine,
      lucidePin,
      lucidePinOff,
      lucideRotateCw,
      lucideTrash2,
      lucideTriangleAlert,
    }),
  ],
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

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the reader holds messaging write access, which gates replying and
   * pinning from this row's menu. Mirrors the server's check, never replaces
   * it.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property actionsEnabled
   * @readonly
   *
   * @description
   * Whether the row offers its per-message menu at all. Off by default so
   * surfaces without the machinery behind it — the reply sheet's own rows,
   * `SubjectDiscussion` — never show controls that lead nowhere.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly actionsEnabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property actionsBusy
   * @readonly
   *
   * @description
   * Whether a message mutation is already in flight, disabling the menu's
   * items so a double press cannot race the first write.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly actionsBusy: InputSignal<boolean> = input<boolean>(false);
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

  /**
   * Property threadRequested
   * @readonly
   *
   * @description
   * Emits the message id whose reply thread the reader wants opened —
   * whether to read the existing replies or to write the first one.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly threadRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property pinToggleRequested
   * @readonly
   *
   * @description
   * Emits the message id the reader wants pinned or unpinned — the direction
   * is the store's to resolve, since it holds the state the row was drawn
   * from.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly pinToggleRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property saveToggleRequested
   * @readonly
   *
   * @description
   * Emits the message id the reader wants bookmarked or un-bookmarked.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly saveToggleRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property editRequested
   * @readonly
   *
   * @description
   * Emits the message id the reader wants to edit. Offered only on the
   * reader's own messages.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly editRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property deleteRequested
   * @readonly
   *
   * @description
   * Emits the message id the reader wants deleted; the page confirms before
   * anything is written.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly deleteRequested: OutputEmitterRef<string> = output<string>();
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
   * Property showThreadItem
   * @readonly
   *
   * @description
   * Whether the menu offers the reply thread: writers may always start one on
   * a live message, and an existing thread stays readable to everyone — even
   * under a tombstoned parent, whose replies the API keeps serving.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showThreadItem: Signal<boolean> = computed((): boolean => {
    const entry: MessageView = this.message();

    return (this.canWrite() && !entry.isDeleted) || entry.replyCount > 0;
  });

  /**
   * Property showPinItem
   * @readonly
   *
   * @description
   * Whether the menu offers pinning — a write, gated like one.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showPinItem: Signal<boolean> = computed(
    (): boolean => this.canWrite() && !this.message().isDeleted,
  );

  /**
   * Property showSaveItem
   * @readonly
   *
   * @description
   * Whether the menu offers bookmarking — private to the reader, so read
   * access is enough.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showSaveItem: Signal<boolean> = computed(
    (): boolean => !this.message().isDeleted,
  );

  /**
   * Property hasActions
   * @readonly
   *
   * @description
   * Whether the row shows its menu trigger at all: actions must be enabled by
   * the surface, the message must have reached the server — an optimistic row
   * has no id anything can act on — and at least one item must survive the
   * permission gates, because a menu the server would refuse item by item is
   * worse than none.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasActions: Signal<boolean> = computed((): boolean => {
    const entry: MessageView = this.message();

    return (
      this.actionsEnabled() &&
      entry.status === 'sent' &&
      (this.showThreadItem() ||
        this.showPinItem() ||
        this.showSaveItem() ||
        entry.canEdit ||
        entry.canDelete)
    );
  });

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
