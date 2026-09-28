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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCheckCheck, lucideTriangleAlert } from '@ng-icons/lucide';
import type { ToggleValue } from '@spartan-ng/brain/toggle-group';
import type { NotificationOutput } from '@features/account/models';
import { displayNotificationBody } from '@features/account/utils/notification-body/notification-body.utils';
import { humanizeNotificationCategory } from '@features/account/utils/notification-category-label';
import { formatRelativeTime } from '@shared/relative-time';
import { StateIllustration } from '@shared/state-illustration';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmMarkerImports } from '@shared/ui/marker';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { HlmTooltipImports } from '@shared/ui/tooltip';

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
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    ...HlmItemImports,
    ...HlmMarkerImports,
    ...HlmToggleGroupImports,
    ...HlmTooltipImports,
    DatePipe,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    StateIllustration,
  ],
  providers: [
    provideIcons({
      lucideCheck,
      lucideCheckCheck,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './account-notification-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationList {
  /**
   * Property notificationBody
   * @readonly
   * @description Removes the legacy onboarding session identifier from stored messages.
   * @access protected
   * @since 1.0.0
   * @type {typeof displayNotificationBody}
   */
  protected readonly notificationBody: typeof displayNotificationBody = displayNotificationBody;

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

  /**
   * Property allCategoryValue
   * @readonly
   *
   * @description
   * Sentinel toggle-group value standing in for "no filter", since the group
   * itself only carries strings.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly allCategoryValue: string = '__all__';
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
   * Turns a timestamp into "3 hours ago", through the shared
   * {@link formatRelativeTime} helper.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} iso - ISO-8601 timestamp from the API.
   *
   * @returns {string} A localized relative label, or the raw value if unparsable.
   */
  protected relativeTime(iso: string): string {
    return formatRelativeTime(iso, this.locale);
  }

  /**
   * Method categoryLabel
   * @method categoryLabel
   *
   * @description
   * Renders a raw category identifier as a readable label, through the shared
   * {@link humanizeNotificationCategory} helper — the same one the preference
   * matrix uses, so a category reads identically everywhere it appears.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} category - The raw category identifier.
   *
   * @returns {string} The human-readable label.
   */
  protected categoryLabel(category: string): string {
    return humanizeNotificationCategory(category);
  }

  /**
   * Method onCategoryToggled
   * @method onCategoryToggled
   *
   * @description
   * Maps the single-select toggle group's value back onto the category filter
   * contract: the sentinel {@link allCategoryValue} becomes `null`. The group's
   * output type covers multi-select and empty states this group never reaches
   * (`type="single"`, `[nullable]="false"`); anything but a plain string is
   * treated as "all" defensively rather than asserted away.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {ToggleValue<string>} value - The toggle group's newly selected value.
   *
   * @returns {void}
   */
  protected onCategoryToggled(value: ToggleValue<string>): void {
    const selected: string = typeof value === 'string' ? value : this.allCategoryValue;
    this.categorySelected.emit(selected === this.allCategoryValue ? null : selected);
  }

  /**
   * Method isDayBoundary
   * @method isDayBoundary
   *
   * @description
   * Whether a notification opens a new calendar day in the device's timezone,
   * so a day separator should render before it.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {NotificationOutput} notification - The row being rendered.
   * @param {NotificationOutput | undefined} previous - The preceding row, or `undefined` for the first one.
   *
   * @returns {boolean} `true` when a separator belongs before `notification`.
   */
  protected isDayBoundary(
    notification: NotificationOutput,
    previous: NotificationOutput | undefined,
  ): boolean {
    return previous === undefined || this.dayKeyOf(notification) !== this.dayKeyOf(previous);
  }

  /**
   * Method dayHeadingOf
   * @method dayHeadingOf
   *
   * @description
   * The localized day heading for a notification's separator, in the
   * interface's language.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {NotificationOutput} notification - The notification opening the day.
   *
   * @returns {string} The formatted day heading, or the raw timestamp when unparseable.
   */
  protected dayHeadingOf(notification: NotificationOutput): string {
    const date: Date = new Date(notification.createdAt);
    if (Number.isNaN(date.getTime())) return notification.createdAt;

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' }).format(date);
  }

  /**
   * Method dayKeyOf
   * @method dayKeyOf
   *
   * @description
   * A sortable `'YYYY-MM-DD'` calendar-day key for a notification, in the
   * device's timezone.
   *
   * @access private
   * @since 1.2.0
   *
   * @param {NotificationOutput} notification - The rendered notification.
   *
   * @returns {string} The calendar-day key, or the raw timestamp when it does not parse.
   */
  private dayKeyOf(notification: NotificationOutput): string {
    const date: Date = new Date(notification.createdAt);
    if (Number.isNaN(date.getTime())) return notification.createdAt;

    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
  //#endregion
}
