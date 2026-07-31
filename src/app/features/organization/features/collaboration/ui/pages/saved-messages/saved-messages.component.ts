import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { FeedbackService } from '@core/feedback';
import { toChatMessageItem } from '@features/organization/features/collaboration/data-access/adapters';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { SavedMessagesStore } from '@features/organization/features/collaboration/state';
import { ChatMessage, type ChatMessageItem } from '@shared/chat';
import { EmptyState } from '@shared/empty-state';

/**
 * Component SavedMessagesPage
 * @class SavedMessagesPage
 *
 * @description
 * The member's bookmarks across the organization — one of the workspace's
 * system views, alongside a channel conversation.
 *
 * Rows are read-only here apart from unsaving: reacting or pinning from a
 * bookmark list would act on a message whose conversation is not loaded.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-saved-messages />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-saved-messages',
  imports: [ChatMessage, EmptyState, SkeletonModule],
  providers: [SavedMessagesStore],
  templateUrl: './saved-messages.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedMessagesPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization identifier, bound from the URL by
   * `withComponentInputBinding()`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * The bookmark list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof SavedMessagesStore>}
   */
  protected readonly store: InstanceType<typeof SavedMessagesStore> = inject(SavedMessagesStore);

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * Toasts. Copying leaves no visible trace of its own, so it needs one.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject(FeedbackService);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Loads the first page whenever the routed organization changes.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      // This endpoint is the one place that rejects a bare UUID.
      this.store.load({ organization: `/api/organizations/${this.organizationId()}` });
    });
  }
  //#endregion

  /**
   * Property chatMessages
   * @readonly
   *
   * @description
   * The bookmarks projected onto the shared chat view-model.
   *
   * No delivery state to apply: a saved message was posted long before it was
   * bookmarked, so every row here is `sent`. Mention names come from the
   * messages themselves — this page has no directory of its own.
   *
   * Deletion is off for the same reason reacting is: `SavedMessagesStore` has
   * no method for it, and a tombstone here would leave the conversation that
   * owns the message showing the text it just removed.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ChatMessageItem<MessageOutput>[]>}
   */
  protected readonly chatMessages: Signal<readonly ChatMessageItem<MessageOutput>[]> = computed(
    (): readonly ChatMessageItem<MessageOutput>[] =>
      this.store.savedEntities().map(
        (message: MessageOutput): ChatMessageItem<MessageOutput> =>
          toChatMessageItem(message, {
            status: 'sent',
            memberNames: message.mentionNames,
            actingMember: null,
            canModerate: false,
            unknownMention: $localize`:@@workspace.mention.unknown:member`,
            unknownAuthor: $localize`:@@workspace.message.unknownAuthor:Unknown member`,
          }),
      ),
  );
  //#endregion

  //#region Methods
  /**
   * Method loadMore
   * @method loadMore
   *
   * @description
   * Fetches the next page of bookmarks.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected loadMore(): void {
    this.store.load({
      organization: `/api/organizations/${this.organizationId()}`,
      page: this.store.loadedPage() + 1,
    });
  }

  /**
   * Method copy
   * @method copy
   *
   * @description
   * Puts a bookmark's text on the clipboard and says so — the action leaves no
   * visible trace of its own.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} text - The message, already flattened to plain text.
   *
   * @return {void}
   */
  protected copy(text: string): void {
    void navigator.clipboard.writeText(text).then(
      (): void =>
        this.feedback.success($localize`:@@workspace.message.copied:Message copied to clipboard.`),
      (): void =>
        this.feedback.error(
          $localize`:@@workspace.message.copyFailed:The message could not be copied.`,
        ),
    );
  }
  //#endregion
}
