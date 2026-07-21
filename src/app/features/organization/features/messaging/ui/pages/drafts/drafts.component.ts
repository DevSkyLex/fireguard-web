import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { ConversationOutput } from '@features/organization/features/messaging/models';
import {
  MessageDraftService,
  type StoredMessageDraft,
} from '@features/organization/features/messaging/services';
import { ConversationInventoryStore } from '@features/organization/features/messaging/state';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EmptyState } from '@shared/components';

/**
 * One Drafts row: the stored draft joined with its conversation, when the
 * inventory knows it.
 *
 * @since 1.0.0
 */
interface DraftRow {
  readonly draft: StoredMessageDraft;
  readonly conversation: ConversationOutput | null;
}

/**
 * Component DraftsPage
 * @class DraftsPage
 *
 * @description
 * Every conversation with a half-typed draft waiting in this workspace.
 * Drafts live in `localStorage` — they are the member's own, never sent
 * automatically — so this page is a join between the stored drafts and the
 * shared conversation inventory. Opening a row lands in the workspace with
 * the draft restored; discarding deletes it in place.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-drafts-page',
  imports: [ButtonModule, DatePipe, EmptyState],
  templateUrl: './drafts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftsPage {
  //#region Properties
  /**
   * Property draftService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageDraftService}
   */
  private readonly draftService: MessageDraftService =
    inject<MessageDraftService>(MessageDraftService);

  /**
   * Property inventory
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ConversationInventoryStore>}
   */
  private readonly inventory: InstanceType<typeof ConversationInventoryStore> = inject(
    ConversationInventoryStore,
  );

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Bumped after a discard so the rows recompute — `localStorage` is not
   * reactive on its own.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  private readonly revision: WritableSignal<number> = signal<number>(0);

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Stored drafts joined with their conversation. A draft whose conversation
   * the inventory does not know keeps its row with the bare excerpt — the
   * text is the member's, and the join must not eat it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly DraftRow[]>}
   */
  protected readonly rows: Signal<readonly DraftRow[]> = computed((): readonly DraftRow[] => {
    this.revision();

    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId === undefined) return [];

    const conversations: readonly ConversationOutput[] = this.inventory.conversations();

    return this.draftService.listForOrganization(organizationId).map(
      (draft: StoredMessageDraft): DraftRow => ({
        draft,
        conversation:
          conversations.find(
            (conversation: ConversationOutput): boolean => conversation.id === draft.conversationId,
          ) ?? null,
      }),
    );
  });
  //#endregion

  //#region Methods
  /**
   * Method labelOf
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {DraftRow} row - The row to label.
   *
   * @returns {string} The conversation label, or a neutral fallback.
   */
  protected labelOf(row: DraftRow): string {
    return row.conversation?.name ?? row.conversation?.subjectLabel ?? '';
  }

  /**
   * Method open
   *
   * @description
   * Lands in the workspace on the draft's conversation; the composer
   * restores the draft from storage.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {DraftRow} row - The row to open.
   *
   * @returns {void}
   */
  protected open(row: DraftRow): void {
    this.router.navigate(['..'], {
      relativeTo: this.route,
      queryParams: { conversation: row.draft.conversationId },
    });
  }

  /**
   * Method discard
   *
   * @description
   * Deletes the stored draft.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {DraftRow} row - The row to discard.
   *
   * @returns {void}
   */
  protected discard(row: DraftRow): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId === undefined) return;

    this.draftService.clear(organizationId, row.draft.conversationId);
    this.revision.update((value: number): number => value + 1);
  }
  //#endregion
}
