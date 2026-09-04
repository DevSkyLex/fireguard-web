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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideCheck, lucideCheckCheck, lucideTriangleAlert } from '@ng-icons/lucide';
import type { NotificationOutput } from '@features/account/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Constant RELATIVE_UNITS
 *
 * @description
 * Thresholds for the relative timestamp, coarsest last. Each entry is the
 * number of seconds in one unit, so the first whose count reaches 1 wins.
 *
 * @since 1.0.0
 */
const RELATIVE_UNITS: ReadonlyArray<{
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly seconds: number;
}> = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
];

/**
 * Component AccountNotificationList
 * @class AccountNotificationList
 *
 * @description
 * The notification feed: what arrived, what is still unread, and one more page
 * on demand. Purely presentational — it takes the collection and emits what the
 * user did with it, and the page calls the store (`ARCHITECTURE.md` §10.3).
 *
 * Opening an unread notification marks it read; there is no separate control
 * for that, because reading one is what "read" means.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-notification-list
 *   [notifications]="store.notifications()"
 *   [loading]="store.isLoading()"
 *   (markedAsRead)="store.markAsRead($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-notification-list',
  imports: [NgIcon, ...HlmEmptyImports, HlmBadge, HlmButton, HlmSkeleton],
  providers: [provideIcons({ lucideBell, lucideCheck, lucideCheckCheck, lucideTriangleAlert })],
  templateUrl: './account-notification-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationList {
  //#region Inputs
  /**
   * Property notifications
   * @readonly
   *
   * @description
   * The feed, newest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<NotificationOutput>>}
   */
  public readonly notifications: InputSignal<ReadonlyArray<NotificationOutput>> = input<
    ReadonlyArray<NotificationOutput>
  >([]);

  /**
   * Property categories
   * @readonly
   *
   * @description
   * The categories on offer as filters.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<string>>}
   */
  public readonly categories: InputSignal<ReadonlyArray<string>> = input<ReadonlyArray<string>>([]);

  /**
   * Property activeCategory
   * @readonly
   *
   * @description
   * The category currently filtered on, or `null` for all of them.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly activeCategory: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the first page is being fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loadingMore
   * @readonly
   *
   * @description
   * Whether another page is being fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasMore
   * @readonly
   *
   * @description
   * Whether the server has more to give.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasMore: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * Whether the last fetch failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property unreadCount
   * @readonly
   *
   * @description
   * How many notifications are unread across the whole feed, not only on the
   * loaded page. Drives whether clearing them all is offered at all.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<number>}
   */
  public readonly unreadCount: InputSignal<number> = input<number>(0);

  /**
   * Property markingAll
   * @readonly
   *
   * @description
   * Whether the bulk clear is in flight.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly markingAll: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property categorySelected
   * @readonly
   *
   * @description
   * Emits the category to filter on, or `null` to clear the filter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly categorySelected: OutputEmitterRef<string | null> = output<string | null>();

  /**
   * Property markedAsRead
   * @readonly
   *
   * @description
   * Emits the id of a notification the user has just read.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly markedAsRead: OutputEmitterRef<string> = output<string>();

  /**
   * Property loadMoreRequested
   * @readonly
   *
   * @description
   * Emits when the user asks for the next page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly loadMoreRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Emits when the user asks to try the failed fetch again.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();

  /**
   * Property allMarkedAsRead
   * @readonly
   *
   * @description
   * Emits when the user clears every unread notification at once.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly allMarkedAsRead: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property locale
   * @readonly
   *
   * @description
   * The application's language, used to phrase the relative timestamps.
   * Injected rather than left to the platform default, so the feed reads in the
   * language the rest of the page is in and not in the one the operating system
   * happens to be set to.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);
  //#endregion

  //#region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Marks a notification read, unless it already is. Guarded here rather than
   * in the page so re-reading one does not fire a pointless request.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NotificationOutput} notification - The notification the user opened.
   *
   * @returns {void}
   */
  protected open(notification: NotificationOutput): void {
    if (notification.isRead) return;

    this.markedAsRead.emit(notification.id);
  }

  /**
   * Method relativeTime
   * @method relativeTime
   *
   * @description
   * Turns a timestamp into "3 hours ago". Uses the platform's
   * `Intl.RelativeTimeFormat` rather than a date library: nothing else in the
   * app formats dates yet, and this is the one place that needs it
   * (`ARCHITECTURE.md` §2.9).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} iso - ISO-8601 timestamp from the API.
   *
   * @returns {string} A localized relative label, or the raw value if unparsable.
   */
  protected relativeTime(iso: string): string {
    const parsed: number = Date.parse(iso);
    if (Number.isNaN(parsed)) return iso;

    const elapsed: number = (parsed - Date.now()) / 1000;
    const format = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });

    for (const { unit, seconds } of RELATIVE_UNITS) {
      if (Math.abs(elapsed) >= seconds) {
        return format.format(Math.round(elapsed / seconds), unit);
      }
    }

    return format.format(Math.round(elapsed), 'second');
  }
  //#endregion
}
