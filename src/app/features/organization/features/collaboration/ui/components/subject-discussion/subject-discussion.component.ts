import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ConversationService } from '@features/organization/features/collaboration/data-access';
import type {
  ConversationOutput,
  MessageReactionToggle,
  MessageView,
  ThreadSubjectType,
} from '@features/organization/features/collaboration/models';
import {
  MessageThreadStore,
  type MessageThreadStoreType,
} from '@features/organization/features/collaboration/state';
import {
  buildMessageViews,
  memberIriOf,
} from '@features/organization/features/collaboration/utils';
import { ORGANIZATION_PERMISSION, type MemberDirectoryEntry } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type MemberDirectoryPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { MessageComposer } from '../../forms/message-composer';
import { MessageThread } from '../message-thread';

/**
 * Component SubjectDiscussion
 * @class SubjectDiscussion
 *
 * @description
 * Collaboration's published surface for attaching a live Messaging thread to
 * another feature's record — `<app-subject-discussion subjectType="intervention"
 * [subjectId]="…" [organizationId]="…" />` inside a caller's own sheet.
 *
 * Self-contained on purpose: it provides its own component-scoped
 * `MessageThreadStore` and injects `ConversationService` directly, which
 * `ARCHITECTURE.md` §10.3 normally reserves for a page. This is not that case
 * — collaboration is the **owner** of the messaging domain this component
 * renders, not a foreign consumer borrowing collaboration's stores the way a
 * table or a form would. Exporting a store-driven unit through `ui/components`
 * is how a feature publishes a self-sufficient widget for another feature's
 * page to embed (`ARCHITECTURE.md` §2.7) — the same shape `AssistantPanel`
 * uses inside its own feature's shell contribution.
 *
 * `POST /api/conversations` is a get-or-create keyed by
 * `(organization, subjectType, subject)` and is called **once per subject**,
 * memoized by that triple: {@link active} lets the caller defer the call until
 * the surface actually opens (a sheet that has never been opened must not
 * cost a request), and re-activating the same subject is a no-op.
 *
 * The thread and composer wiring — rendered `MessageView`s, mention markers,
 * the read-marker gated on tab visibility, `MessageThreadStore.reset()` before
 * a subject change — mirrors `ChannelConversationPage` and
 * `DirectConversationPage`; `buildMessageViews` is the shared mapping the
 * three now call (`ARCHITECTURE.md` §2.9 — the rule of three).
 *
 * **Mention candidates are the whole directory, not a narrowed pair.** A
 * subject thread's `visibility` is `'subject'` — access defers to the
 * attached record's own read permission — so, unlike a channel or a direct
 * conversation, there is no participant roster to narrow against; the API
 * itself does not restrict who may be mentioned here.
 *
 * @since 1.0.0
 *
 * @example
 * ```html
 * <app-subject-discussion
 *   subjectType="intervention"
 *   [subjectId]="interventionId()"
 *   [organizationId]="organizationId()"
 *   [active]="sheetOpen()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-subject-discussion',
  imports: [MessageComposer, MessageThread],
  providers: [MessageThreadStore],
  templateUrl: './subject-discussion.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectDiscussion {
  //#region Inputs
  /** The owning organization, bare UUID. */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** The attached record's kind, as `POST /api/conversations` accepts it. */
  public readonly subjectType: InputSignal<ThreadSubjectType> = input.required<ThreadSubjectType>();

  /** The attached record's bare id. */
  public readonly subjectId: InputSignal<string> = input.required<string>();

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether the thread should be opened. `false` by default so a surface that
   * embeds this inside a closed sheet never costs a request until the reader
   * actually opens it.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly active: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /**
   * Property thread
   * @readonly
   *
   * @description
   * This subject's messages, its paging and its realtime connection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MessageThreadStoreType}
   */
  protected readonly thread: MessageThreadStoreType =
    inject<MessageThreadStoreType>(MessageThreadStore);

  /** Why the thread could not be opened, or `null`. */
  protected readonly openError: WritableSignal<string | null> = signal<string | null>(null);

  /** Whether the get-or-create call is in flight. */
  protected readonly opening: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property messages
   * @readonly
   *
   * @description
   * The thread as the surface draws it — see {@link buildMessageViews}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MessageView[]>}
   */
  protected readonly messages: Signal<readonly MessageView[]> = computed(
    (): readonly MessageView[] =>
      buildMessageViews({
        messages: this.thread.sortedMessages(),
        pendingMessageIds: this.thread.pendingMessageIds(),
        failedMessageIds: this.thread.failedMessageIds(),
        ownMemberIri: memberIriOf(this.memberAccess.profile()),
        directory: this.directory.isAvailable() ? this.directory.byId() : null,
        unknownMemberLabel: this.unknownMemberLabel,
      }),
  );

  /**
   * Property mentionCandidates
   * @readonly
   *
   * @description
   * Every active organization member — see the class doc for why this thread
   * does not narrow to a participant pair the way a channel does.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly mentionCandidates: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      if (!this.directory.isAvailable()) return [];

      return [...this.directory.byId().values()].filter(
        (member: MemberDirectoryEntry): boolean => member.isActive,
      );
    },
  );

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the reader may post here. Reading is what opened the sheet; it
   * does not imply `messaging.write`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed((): boolean =>
    this.memberAccess
      .permissions()
      .some(
        (granted: string): boolean =>
          granted === ORGANIZATION_PERMISSION.MESSAGING_WRITE ||
          (granted.endsWith('.*') &&
            ORGANIZATION_PERMISSION.MESSAGING_WRITE.startsWith(granted.slice(0, -1))),
      ),
  );

  /**
   * Property loadErrorMessage
   * @readonly
   *
   * @description
   * Why the thread could not be read, once opened — `null` when it could.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly loadErrorMessage: Signal<string | null> = computed(
    (): string | null => this.openError() ?? this.thread.loadError()?.message ?? null,
  );

  /** The resolved conversation, or `null` before the get-or-create resolves. */
  private readonly conversationId: WritableSignal<string | null> = signal<string | null>(null);

  /** The last `(organization, subjectType, subject)` triple opened, so re-activation is a no-op. */
  private lastOpenedKey: string | null = null;

  private readonly conversations: ConversationService =
    inject<ConversationService>(ConversationService);

  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  private readonly document: Document = inject<Document>(DOCUMENT);

  /** Stands in wherever a member cannot be named. Never a raw id. */
  private readonly unknownMemberLabel: string = $localize`:@@messages.unknownMember:Unknown member`;
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Opens the subject's thread once {@link active} is true, memoized by
   * `(organization, subjectType, subject)` so re-activating the same subject
   * — closing and reopening the caller's sheet — never repeats the
   * get-or-create call.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.active()) return;

      const organizationId: string = this.organizationId();
      const subjectType: ThreadSubjectType = this.subjectType();
      const subjectId: string = this.subjectId();

      untracked((): void => this.openThread(organizationId, subjectType, subjectId));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Posts a message to the resolved conversation. A no-op before the
   * get-or-create resolves — the composer is disabled through
   * {@link canWrite} and {@link opening} until then.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} body - The written message.
   *
   * @returns {void}
   */
  protected send(body: string): void {
    const conversationId: string | null = this.conversationId();

    if (conversationId === null) return;

    this.thread.send({ conversationId, input: { body } });
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Moves the read marker once the newest message is on screen, and only
   * while the tab is actually visible.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected markRead(): void {
    const conversationId: string | null = this.conversationId();

    if (conversationId === null || this.document.visibilityState !== 'visible') return;

    this.thread.markRead({ conversationId });
  }

  /**
   * Method toggleReaction
   * @method toggleReaction
   *
   * @description
   * Adds or withdraws the reader's reaction.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageReactionToggle} toggle - The pressed emoji and its message.
   *
   * @returns {void}
   */
  protected toggleReaction(toggle: MessageReactionToggle): void {
    this.thread.toggleReaction(toggle.messageId, toggle.emoji);
  }

  /**
   * Method openThread
   * @method openThread
   *
   * @description
   * Runs the get-or-create call for one subject and wires the resolved
   * conversation into the thread store.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {ThreadSubjectType} subjectType - The attached record's kind.
   * @param {string} subjectId - The attached record's id.
   *
   * @returns {void}
   */
  private openThread(
    organizationId: string,
    subjectType: ThreadSubjectType,
    subjectId: string,
  ): void {
    const key: string = `${organizationId}:${subjectType}:${subjectId}`;

    if (key === this.lastOpenedKey) return;

    this.lastOpenedKey = key;
    this.thread.reset();
    this.conversationId.set(null);
    this.openError.set(null);
    this.opening.set(true);

    this.conversations
      .openSubjectThread({ organization: organizationId, subjectType, subject: subjectId })
      .subscribe({
        next: (conversation: ConversationOutput): void => {
          this.opening.set(false);
          this.conversationId.set(conversation.id);
          this.thread.load(conversation.id);
          this.thread.connect(conversation.id);
          this.thread.markRead({ conversationId: conversation.id });
        },
        error: (): void => {
          this.opening.set(false);
          this.openError.set(
            $localize`:@@messages.subjectDiscussion.openFailed:The discussion could not be opened.`,
          );
        },
      });
  }
  //#endregion
}
