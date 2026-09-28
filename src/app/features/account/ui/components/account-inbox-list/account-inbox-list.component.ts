import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import type { InboxItemOutput } from '@features/account/models';
import { displayInboxTitle } from '@features/account/utils/inbox-item-title';
import { inboxConversationLink } from '@features/account/utils/inbox-link';
import { displayNotificationBody } from '@features/account/utils/notification-body/notification-body.utils';
import { formatRelativeTime } from '@shared/relative-time';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmMarkerImports } from '@shared/ui/marker';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTooltipImports } from '@shared/ui/tooltip';

/**
 * Component AccountInboxList
 * @class AccountInboxList
 * @description Presents server-ordered source entries and completeness. The owner handles reads, pagination and retries.
 * @since 1.0.0
 */
@Component({
  selector: 'app-account-inbox-list',
  imports: [
    DatePipe,
    NgIcon,
    RouterLink,
    ...HlmAlertImports,
    ...HlmEmptyImports,
    ...HlmMarkerImports,
    ...HlmTooltipImports,
    HlmButton,
    HlmItemImports,
    HlmSkeleton,
    StateIllustration,
  ],
  providers: [provideIcons({ lucideCircleAlert })],
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

  /**
   * Property notificationBody
   * @readonly
   * @description Removes the legacy onboarding session identifier from stored previews.
   * @access protected
   * @since 1.0.0
   * @type {typeof displayNotificationBody}
   */
  protected readonly notificationBody: typeof displayNotificationBody = displayNotificationBody;

  /**
   * Property locale
   * @readonly
   * @description The application's language, used to phrase the relative timestamp.
   * @access private
   * @since 1.1.0
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Method relativeTime
   * @method relativeTime
   * @description Phrases an ISO timestamp relative to now, in the interface's language.
   * @access protected
   * @since 1.1.0
   * @param {string} iso - The ISO 8601 timestamp to phrase.
   * @returns {string} The localized relative phrase.
   */
  protected relativeTime(iso: string): string {
    return formatRelativeTime(iso, this.locale);
  }

  /**
   * Method isDayBoundary
   * @method isDayBoundary
   * @description Whether an entry opens a new calendar day in the device's timezone, so a day separator should render before it.
   * @access protected
   * @since 1.2.0
   * @param {InboxItemOutput} item - The entry being rendered.
   * @param {InboxItemOutput | undefined} previous - The preceding entry, or `undefined` for the first one.
   * @returns {boolean} `true` when a separator belongs before `item`.
   */
  protected isDayBoundary(item: InboxItemOutput, previous: InboxItemOutput | undefined): boolean {
    return previous === undefined || this.dayKeyOf(item) !== this.dayKeyOf(previous);
  }

  /**
   * Method dayHeadingOf
   * @method dayHeadingOf
   * @description The localized day heading for an entry's separator, in the interface's language.
   * @access protected
   * @since 1.2.0
   * @param {InboxItemOutput} item - The entry opening the day.
   * @returns {string} The formatted day heading, or the raw timestamp when unparseable.
   */
  protected dayHeadingOf(item: InboxItemOutput): string {
    const date: Date = new Date(item.occurredAt);
    if (Number.isNaN(date.getTime())) return item.occurredAt;

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' }).format(date);
  }

  /**
   * Method dayKeyOf
   * @method dayKeyOf
   * @description A sortable `'YYYY-MM-DD'` calendar-day key for an entry, in the device's timezone.
   * @access private
   * @since 1.2.0
   * @param {InboxItemOutput} item - The rendered entry.
   * @returns {string} The calendar-day key, or the raw timestamp when it does not parse.
   */
  private dayKeyOf(item: InboxItemOutput): string {
    const date: Date = new Date(item.occurredAt);
    if (Number.isNaN(date.getTime())) return item.occurredAt;

    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}
