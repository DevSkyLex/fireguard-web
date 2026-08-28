import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { MessageView } from '@features/organization/features/collaboration/models';
import {
  MessageRepliesStore,
  messageRepliesStoreEvents,
  type MessageRepliesStoreType,
} from '@features/organization/features/collaboration/state';
import {
  buildMessageViews,
  memberIriOf,
} from '@features/organization/features/collaboration/utils';
import type { MemberDirectoryEntry } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type MemberDirectoryPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { MessageRow } from '../../components/message-row';
import { MessageComposer } from '../../forms/message-composer';

/**
 * Component MessageReplySheet
 * @class MessageReplySheet
 *
 * @description
 * One message's reply thread: the parent quoted on top, its replies below,
 * and a composer — a side sheet, because the conversation pages already own
 * the only scroller on the page and a second full pane would fight it.
 *
 * Owns its component-scoped {@link MessageRepliesStore} the way
 * `SubjectDiscussion` owns its thread store: the host page supplies only the
 * parent message and permissions, and hears {@link replyPosted} so it can
 * bump the parent row's counter. Threading is single-level server-side, so
 * reply rows never offer actions of their own.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-reply-sheet
 *   [visible]="replyTarget() !== null"
 *   [parent]="replyTargetView()"
 *   [canWrite]="canWrite()"
 *   [members]="mentionCandidates()"
 *   (visibleChange)="onReplySheetVisibleChange($event)"
 *   (replyPosted)="thread.noteReplyPosted($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-reply-sheet',
  imports: [MessageComposer, MessageRow, HlmSkeleton, ...HlmSheetImports],
  providers: [MessageRepliesStore],
  templateUrl: './message-reply-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageReplySheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the sheet is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property parent
   * @readonly
   *
   * @description
   * The root message whose thread is open, already rendered by the page —
   * the same view its row was drawn from.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MessageView | null>}
   */
  public readonly parent: InputSignal<MessageView | null> = input<MessageView | null>(null);

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the reader may reply. Reading the thread does not grant it, so
   * the composer is gated separately.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property members
   * @readonly
   *
   * @description
   * Who the composer may offer as a mention — the same candidates the page
   * offers its main composer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberDirectoryEntry[]>}
   */
  public readonly members: InputSignal<readonly MemberDirectoryEntry[]> = input<
    readonly MemberDirectoryEntry[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Reports the sheet opening or closing, including a dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property replyPosted
   * @readonly
   *
   * @description
   * Emits the parent's id each time a reply is persisted, so the page can
   * bump the parent row's counter without a refetch.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly replyPosted: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property replies
   * @readonly
   *
   * @description
   * The thread's replies, its paging state and its post state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MessageRepliesStoreType}
   */
  protected readonly replies: MessageRepliesStoreType =
    inject<MessageRepliesStoreType>(MessageRepliesStore);

  /**
   * Property replyViews
   * @readonly
   *
   * @description
   * The replies as the sheet draws them. Reply rows never carry actions, so
   * the permission flags are passed as off.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MessageView[]>}
   */
  protected readonly replyViews: Signal<readonly MessageView[]> = computed(
    (): readonly MessageView[] =>
      buildMessageViews({
        messages: this.replies.sortedReplies(),
        pendingMessageIds: [],
        failedMessageIds: [],
        ownMemberIri: memberIriOf(this.memberAccess.profile()),
        directory: this.directory.isAvailable() ? this.directory.byId() : null,
        unknownMemberLabel: this.unknownLabel,
        canWrite: false,
        canManage: false,
      }),
  );

  /**
   * Property sheetState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description Right-anchored on desktop, a bottom drawer under `sm`.
   * @access protected
   * @since 1.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property statusText
   * @readonly
   *
   * @description
   * What the sheet's `role="status"` line announces: loading, a failure, or
   * nothing. The reply list itself is not a live region — it is readable
   * silently, the way the main thread is.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly statusText: Signal<string> = computed((): string => {
    if (this.replies.isLoading()) return $localize`:@@messages.replies.loading:Loading replies…`;
    if (this.replies.loadError() !== null)
      return $localize`:@@messages.replies.loadFailed:Replies could not be loaded.`;
    if (this.replies.isPosting()) return $localize`:@@messages.replies.posting:Sending reply…`;
    if (this.replies.postError() !== null)
      return $localize`:@@messages.replies.postFailed:The reply could not be sent.`;

    return '';
  });

  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /** Stands in wherever a member cannot be named. Never a raw id. */
  private readonly unknownLabel: string = $localize`:@@messages.unknownMember:Unknown member`;
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Loads the thread when the sheet opens on a new parent — the store
   * survives across opens, so it is reset first — and relays each persisted
   * reply to the page.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      const parent: MessageView | null = this.parent();

      if (parent === null) return;

      untracked((): void => {
        if (this.replies.parentMessageId() === parent.id) return;

        this.replies.reset();
        this.replies.load(parent.id);
      });
    });

    inject(Events)
      .on(messageRepliesStoreEvents.replyPosted)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }): void => {
        this.replyPosted.emit(payload.parentMessageId);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal back to the page, which owns the flag this is
   * derived from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method send
   * @method send
   *
   * @description
   * Posts a reply under the open parent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} body - The written reply.
   *
   * @returns {void}
   */
  protected send(body: string): void {
    const parent: MessageView | null = this.parent();

    if (parent === null) return;

    this.replies.reply({ parentMessageId: parent.id, input: { body } });
  }
  //#endregion
}
