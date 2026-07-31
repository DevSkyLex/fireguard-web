import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { EmptyState } from '@shared/empty-state';
import { ChatMessageExtraDirective } from '../../chat-message-extra.directive';
import type {
  ChatEntry,
  ChatMessageContext,
  ChatMessageItem,
  ChatReactionEvent,
} from '../../models';
import { groupChatEntries } from '../../utils';
import { ChatMessage } from '../chat-message';

/** Placeholder rows drawn while the first page loads. */
const DEFAULT_SKELETON_ROWS: readonly number[] = [1, 2, 3, 4, 5, 6];

/**
 * Component ChatThread
 * @class ChatThread
 *
 * @description
 * A conversation: its scrolling history, the date rules that break it up, and
 * the states it can be in — loading, empty, failed, or with older messages
 * still to fetch.
 *
 * Presentational. It injects no store and fetches nothing: it is handed the
 * messages it should draw and reports what the reader did with them. Even
 * "load older" is an output — how many pages there are, and what to ask for
 * next, is the consumer's arithmetic.
 *
 * **Every label is an input.** Two conversations in the same application can
 * legitimately name themselves differently, and a shared concept cannot own
 * either string.
 *
 * The scroller spans the whole column, top to bottom, so its scrollbar runs the
 * full height and stays at the pane's edge. The content inside is held to a
 * reading measure, and `scrollbar-gutter: stable both-edges` keeps that measure
 * centred — reserved on one side only, the scrollbar would shift the content
 * box half its width off centre.
 *
 * Whatever is projected into the component becomes a **footer stuck to the
 * bottom of the scroller** — a composer, in practice. It lives inside the
 * scroll container rather than beside it for two reasons: the scrollbar then
 * reaches the bottom of the pane instead of stopping short, and the footer
 * shares the messages' content box, so the two line up at every width without
 * anyone having to compensate for the scrollbar.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-chat-thread [messages]="messages()" [label]="'Conversation'" (loadMore)="loadOlder()">
 *   <ng-template appChatMessageExtra let-message>…</ng-template>
 * </app-chat-thread>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-chat-thread',
  imports: [ChatMessage, DatePipe, EmptyState, SkeletonModule],
  templateUrl: './chat-thread.component.html',
  host: {
    class:
      'flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 [scrollbar-gutter:stable_both-edges] md:px-6',
    role: 'log',
    '[attr.aria-label]': 'label()',
    '[attr.aria-busy]': 'loading()',
    'data-testid': 'chat-thread',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatThread<TData = unknown> {
  //#region Inputs
  /**
   * Property messages
   * @readonly
   *
   * @description
   * The conversation, oldest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChatMessageItem<TData>[]>}
   */
  public readonly messages: InputSignal<readonly ChatMessageItem<TData>[]> = input<
    readonly ChatMessageItem<TData>[]
  >([]);

  /**
   * Property label
   * @readonly
   *
   * @description
   * The log region's accessible name — what this conversation is.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a read is in flight, which both marks the region busy and draws
   * placeholders when there is nothing yet.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * A already-worded failure to show above the history, or `null`.
   *
   * A string rather than an error object: a shared concept owns no error model,
   * and the consumer has already decided what to say.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property hasMore
   * @readonly
   *
   * @description
   * Whether older messages remain to be fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasMore: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loadedCount
   * @readonly
   *
   * @description
   * How many messages are loaded, for the counter beside the load control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly loadedCount: InputSignal<number> = input<number>(0);

  /**
   * Property totalCount
   * @readonly
   *
   * @description
   * How many there are in total.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly totalCount: InputSignal<number> = input<number>(0);

  /**
   * Property loadMoreLabel
   * @readonly
   *
   * @description
   * What the load control says. "Load earlier messages" in a conversation is
   * not "Load more" in a bookmark list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly loadMoreLabel: InputSignal<string> = input<string>('');

  /**
   * Property emptyIcon
   * @readonly
   *
   * @description
   * Icon for the empty placeholder.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyIcon: InputSignal<string> = input<string>('pi pi-comments');

  /**
   * Property emptyTitle
   * @readonly
   *
   * @description
   * Heading of the empty placeholder.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyTitle: InputSignal<string> = input<string>('');

  /**
   * Property emptyDescription
   * @readonly
   *
   * @description
   * Body of the empty placeholder.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyDescription: InputSignal<string> = input<string>('');

  /**
   * Property loadingLabel
   * @readonly
   *
   * @description
   * What the skeleton announces while the first page arrives.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly loadingLabel: InputSignal<string> = input<string>('');

  /**
   * Property canReact
   * @readonly
   *
   * @description
   * Whether rows offer reacting.
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
   * Whether rows offer pinning.
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
   * Whether rows offer bookmarking.
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
   * Whether rows offer replying, and show their reply count.
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
   * Whether rows offer copying their text.
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
   * Whether rows offer moving a read marker. Off by default: a surface with no
   * marker of its own must not offer to move one.
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
   * Whether this surface offers deletion at all — a veto over each message's
   * own `canDelete`, never a grant.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canDelete: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property continuationWindowMs
   * @readonly
   *
   * @description
   * How long one author's run may pause before the next message starts a new
   * turn.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number | undefined>}
   */
  public readonly continuationWindowMs: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  //#endregion

  //#region Outputs
  /** Emits when the reader asks for older messages. */
  public readonly loadMore: OutputEmitterRef<void> = output<void>();
  /** Emits the message and emoji the reader reacted with. */
  public readonly reacted: OutputEmitterRef<ChatReactionEvent> = output<ChatReactionEvent>();
  /** Emits the message and emoji whose reaction the reader is taking back. */
  public readonly reactionRemoved: OutputEmitterRef<ChatReactionEvent> =
    output<ChatReactionEvent>();
  /** Emits the id of the message whose bookmark was toggled. */
  public readonly saveToggled: OutputEmitterRef<string> = output<string>();
  /** Emits the id of the message whose pin was toggled; its `isPinned` gives the direction. */
  public readonly pinToggled: OutputEmitterRef<string> = output<string>();
  /** Emits the id of the message whose reply thread the reader wants. */
  public readonly replied: OutputEmitterRef<string> = output<string>();
  /** Emits a message as plain text, for the consumer to put on the clipboard. */
  public readonly copied: OutputEmitterRef<string> = output<string>();
  /** Emits the id of the message to mark the conversation read up to. */
  public readonly markedRead: OutputEmitterRef<string> = output<string>();
  /** Emits the id of the message the reader asked to delete. Confirming is the consumer's job. */
  public readonly deleted: OutputEmitterRef<string> = output<string>();
  /** Emits the id of the failed message to send again. */
  public readonly retried: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonRows
   * @readonly
   *
   * @description
   * Placeholder rows drawn while the first page loads.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  protected readonly skeletonRows: readonly number[] = DEFAULT_SKELETON_ROWS;

  /**
   * Property extraDirective
   * @readonly
   *
   * @description
   * The consumer's per-message template, if it projected one.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ChatMessageExtraDirective<TData> | undefined>}
   */
  private readonly extraDirective: Signal<ChatMessageExtraDirective<TData> | undefined> =
    contentChild(ChatMessageExtraDirective);

  /**
   * Property extraTemplate
   * @readonly
   *
   * @description
   * That template's `TemplateRef`, handed down to every row — `contentChild`
   * does not reach across a component boundary, so the hop is mandatory.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<ChatMessageContext<TData>> | null>}
   */
  protected readonly extraTemplate: Signal<TemplateRef<ChatMessageContext<TData>> | null> =
    computed(() => this.extraDirective()?.templateRef ?? null);

  /**
   * Property entries
   * @readonly
   *
   * @description
   * The conversation as it renders: date rules, and messages flagged as
   * continuations of the previous author's run.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ChatEntry<TData>[]>}
   */
  protected readonly entries: Signal<readonly ChatEntry<TData>[]> = computed(
    (): readonly ChatEntry<TData>[] =>
      groupChatEntries(this.messages(), this.continuationWindowMs()),
  );
  //#endregion
}
