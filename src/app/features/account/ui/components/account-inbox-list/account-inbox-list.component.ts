import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { InboxItemOutput } from '@features/account/models';
import { displayInboxTitle } from '@features/account/utils/inbox-item-title';
import { inboxConversationLink } from '@features/account/utils/inbox-link';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AccountInboxList
 * @class AccountInboxList
 * @description Presents server-ordered source entries and completeness. The owner handles reads, pagination and retries.
 * @since 1.0.0
 */
@Component({
  selector: 'app-account-inbox-list',
  imports: [DatePipe, RouterLink, HlmButton, HlmItemImports, HlmSkeleton],
  templateUrl: './account-inbox-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountInboxList {
  /**
   * Property items
   * @readonly
   * @description Server-ordered inbox entries.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InboxItemOutput[]>}
   */
  public readonly items: InputSignal<readonly InboxItemOutput[]> =
    input.required<readonly InboxItemOutput[]>();
  /**
   * Property loading
   * @readonly
   * @description Initial read activity.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);
  /**
   * Property loadingMore
   * @readonly
   * @description Pagination activity.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input(false);
  /**
   * Property complete
   * @readonly
   * @description Whether all sources contributed to the current page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly complete: InputSignal<boolean> = input(true);
  /**
   * Property hasError
   * @readonly
   * @description Feed request failure.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly hasError: InputSignal<boolean> = input(false);
  /**
   * Property readFailed
   * @readonly
   * @description Failed acknowledgement, preserving the unread entry for retry.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly readFailed: InputSignal<boolean> = input(false);
  /**
   * Property hasMore
   * @readonly
   * @description Availability of another complete cursor page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly hasMore: InputSignal<boolean> = input(false);
  /**
   * Property readRequested
   * @readonly
   * @description Notification acknowledgement command; conversation reads stay source-owned.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InboxItemOutput>}
   */
  public readonly readRequested: OutputEmitterRef<InboxItemOutput> = output<InboxItemOutput>();
  /**
   * Property moreRequested
   * @readonly
   * @description Request the next opaque page.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly moreRequested: OutputEmitterRef<void> = output<void>();
  /**
   * Property retryRequested
   * @readonly
   * @description Reload all contributors after a partial response or failure.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();
  /**
   * Property conversationLink
   * @readonly
   * @description Published route selection without a transport lookup.
   * @access protected
   * @since 1.0.0
   * @type {typeof inboxConversationLink}
   */
  protected readonly conversationLink: typeof inboxConversationLink = inboxConversationLink;

  /**
   * Property inboxTitle
   * @readonly
   * @description Localized title for known source-owned inbox entries.
   * @access protected
   * @since 1.0.0
   * @type {typeof displayInboxTitle}
   */
  protected readonly inboxTitle: typeof displayInboxTitle = displayInboxTitle;
}
