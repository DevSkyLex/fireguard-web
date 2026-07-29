import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type Signal,
  untracked,
} from '@angular/core';
import type {
  MessageOutput,
  ThreadEntry,
} from '@features/organization/features/collaboration/models';
import {
  DirectConversationsStore,
  MessageThreadStore,
} from '@features/organization/features/collaboration/state';
import {
  MessageComposer,
  MessageRow,
} from '@features/organization/features/collaboration/ui/components';
import { groupThreadMessages } from '@features/organization/features/collaboration/utils';
import {
  MEMBER_DIRECTORY_PORT,
  type MemberDirectoryPort,
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { EmptyState, Skeleton } from '@shared/components';
import { deriveInitials } from '@shared/utils';

/**
 * Component DirectConversationPage
 * @class DirectConversationPage
 *
 * @description
 * Route entry for one direct (1-to-1) conversation. Reuses the channel
 * conversation column — the same thread and composer — and differs only in its
 * header, which names the other member instead of a channel.
 *
 * The counterpart is reported only by `GET /api/direct-conversations`, so the
 * name is resolved from the shared {@link DirectConversationsStore} (loaded for
 * the whole sidebar) through the member directory, never from the single
 * conversation read, which carries no label for a direct conversation.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-direct-conversation />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-direct-conversation',
  imports: [DatePipe, EmptyState, MessageComposer, MessageRow, Skeleton],
  providers: [MessageThreadStore],
  templateUrl: './direct-conversation.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectConversationPage {
  //#region Inputs
  /**
   * Property conversationId
   * @readonly
   *
   * @description
   * Routed direct-conversation identifier, bound from the URL by
   * `withComponentInputBinding()`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly conversationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property directConversations
   * @readonly
   *
   * @description
   * Shared direct-conversations store — the only source of the counterpart
   * member reference.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DirectConversationsStoreType}
   */
  private readonly directConversations: InstanceType<typeof DirectConversationsStore> =
    inject(DirectConversationsStore);

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Member directory, resolving the counterpart's IRI to a display name.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MemberDirectoryPort}
   */
  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Routed organization, consumed through the organization port.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property thread
   * @readonly
   *
   * @description
   * The conversation's message thread.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof MessageThreadStore>}
   */
  protected readonly thread: InstanceType<typeof MessageThreadStore> = inject(MessageThreadStore);

  /**
   * Property counterpartName
   * @readonly
   *
   * @description
   * The other member's display name, or a neutral label until the directory
   * and the conversation list have resolved — never an id.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly counterpartName: Signal<string> = computed((): string => {
    const counterpart: string | undefined = this.directConversations.counterpartFor(
      this.conversationId(),
    );

    if (!counterpart) return $localize`:@@workspace.direct.unknownMember:Direct message`;

    return this.directory.displayNameFor(counterpart);
  });

  /**
   * Property counterpartInitials
   * @readonly
   *
   * @description
   * Initials for the header avatar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly counterpartInitials: Signal<string> = computed((): string =>
    deriveInitials(this.counterpartName()),
  );

  /**
   * Property composerPlaceholder
   * @readonly
   *
   * @description
   * Prompt naming the member being written to.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly composerPlaceholder: Signal<string> = computed(
    (): string =>
      $localize`:@@workspace.direct.composer.placeholder:Message ${this.counterpartName()}:memberName:`,
  );

  /**
   * Property entries
   * @readonly
   *
   * @description
   * The thread as it renders: day separators, and messages flagged as
   * continuations of the previous author's run.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ThreadEntry[]>}
   */
  protected readonly entries: Signal<readonly ThreadEntry[]> = computed(
    (): readonly ThreadEntry[] => groupThreadMessages(this.thread.messageEntities()),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Loads the thread and connects its realtime topic whenever the route
   * changes, and makes sure the shared conversation list and the member
   * directory are loaded so the counterpart resolves.
   *
   * @since 1.0.0
   */
  public constructor() {
    // The thread follows the route.
    effect((): void => {
      const conversationId: string = this.conversationId();

      this.thread.load({ conversationId });
      this.thread.connect(conversationId);
      // Opening the conversation clears its unread badge in the sidebar.
      this.thread.markRead(conversationId);
    });

    // The shared list and directory follow the organization. `ensureLoaded`
    // reads store state to decide whether to fetch; that read is untracked so
    // this effect depends on the organization alone and never re-fires on a
    // load transition.
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null) return;

      untracked((): void => {
        this.directConversations.ensureLoaded(organizationId);
        this.directory.ensureLoaded(organizationId);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method authorNameFor
   * @method authorNameFor
   *
   * @description
   * Resolves an author's display label, which rides on the message itself.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageOutput} message - Message whose author is being labelled.
   *
   * @return {string} The author's name, or a neutral label — never an id.
   */
  protected authorNameFor(message: MessageOutput): string {
    return (
      message.authorDisplayName ?? $localize`:@@workspace.message.unknownAuthor:Unknown member`
    );
  }

  /**
   * Method send
   * @method send
   *
   * @description
   * Posts what the composer emitted.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} body - Trimmed message body.
   *
   * @return {void}
   */
  protected send(body: string): void {
    this.thread.send({ conversationId: this.conversationId(), input: { body } });
  }

  /**
   * Method react
   * @method react
   *
   * @description
   * Adds a reaction to a message.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} messageId - Message being reacted to.
   * @param {string} emoji - Emoji to add.
   *
   * @return {void}
   */
  protected react(messageId: string, emoji: string): void {
    this.thread.react({ messageId, input: { emoji } });
  }

  /**
   * Method removeReaction
   * @method removeReaction
   *
   * @description
   * Takes back the acting member's reaction with an emoji.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} messageId - Message the reaction is on.
   * @param {string} emoji - Emoji to take back.
   *
   * @return {void}
   */
  protected removeReaction(messageId: string, emoji: string): void {
    this.thread.removeReaction({ messageId, emoji });
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Sends a failed message again, under the id it already carries.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} clientId - Client-minted id of the failed message.
   *
   * @return {void}
   */
  protected retry(clientId: string): void {
    void this.thread.retryFailed(clientId);
  }

  /**
   * Method loadOlder
   * @method loadOlder
   *
   * @description
   * Fetches the next page of history. Messages arrive oldest-first, so older
   * history is a *further* page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected loadOlder(): void {
    this.thread.load({
      conversationId: this.conversationId(),
      page: this.thread.loadedPage() + 1,
    });
  }
  //#endregion
}
