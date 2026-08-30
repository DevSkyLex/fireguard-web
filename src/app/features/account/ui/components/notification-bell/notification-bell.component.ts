import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideBell } from '@ng-icons/lucide';
import type { NotificationOutput } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { HlmButton } from '@shared/ui/button';
import {
  HlmItem,
  HlmItemActions,
  HlmItemContent,
  HlmItemDescription,
  HlmItemMedia,
  HlmItemTitle,
} from '@shared/ui/item';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSidebarService } from '@shared/ui/sidebar';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Constant UNREAD_DISPLAY_CEILING
 *
 * @description
 * Above this, the menu header reads `99+` rather than a number nobody counts.
 *
 * @since 1.0.0
 */
const UNREAD_DISPLAY_CEILING: number = 99;

/**
 * Constant RELATIVE_UNITS
 *
 * @description
 * Thresholds for the relative timestamp, coarsest first. The first whose count
 * reaches 1 wins.
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
 * Component NotificationBell
 * @class NotificationBell
 *
 * @description
 * The header bell: a dot when something is waiting, and a menu holding the
 * three most recent notifications plus the way to the notification centre.
 *
 * The dot reads `unreadCount`, never `hasUnread`. `hasUnread` is derived from
 * the entities already loaded, so it is `false` until the menu has been opened
 * once — the count comes from `/api/inbox/unread-count` and is primed at boot,
 * which is the only value that can be trusted before then.
 *
 * The list is fetched on first open rather than at boot, and only when the
 * collection is genuinely empty: `initialize()` may already have filled it, and
 * Mercure keeps it live afterwards, so re-fetching on every open would be a
 * duplicate request (`AGENTS.md` § Routing, SSR, And Hydration).
 *
 * It is a popover, not a dropdown menu, because CDK's `CdkMenuItem.trigger()`
 * closes the whole stack on every click — marking one notification read would
 * dismiss the panel. `InterventionSyncIndicator` is the same trade in the same
 * header.
 *
 * It injects the store directly, as the root of its own slot surface — the same
 * exception `OrganizationSwitcher` takes, recorded in `FEATURE.md`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-notification-bell />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell',
  imports: [
    NgIcon,
    RouterLink,
    HlmButton,
    HlmItem,
    HlmItemActions,
    HlmItemContent,
    HlmItemDescription,
    HlmItemMedia,
    HlmItemTitle,
    ...HlmPopoverImports,
    HlmSeparator,
    HlmSkeleton,
  ],
  providers: [provideIcons({ lucideArrowRight, lucideBell })],
  templateUrl: './notification-bell.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * The notification feed, root-provided and primed by the account feature's
   * initializer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationStore}
   */
  protected readonly store: NotificationStore = inject<NotificationStore>(NotificationStore);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active locale, for the relative timestamps.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property sidebar
   * @readonly
   *
   * @description
   * Consulted only for its viewport breakpoint, which decides the panel's
   * anchor.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {HlmSidebarService}
   */
  private readonly sidebar: HlmSidebarService = inject<HlmSidebarService>(HlmSidebarService);

  /**
   * Property panelAlign
   * @readonly
   *
   * @description
   * Where the panel hangs from the bell. `end` pins its right edge to the
   * bell's, which is right on a wide header but ruinous on a narrow one: three
   * more actions sit to the bell's right, so the panel gets only the 207px to
   * its left and every subject truncates to a few characters. Centring it on
   * the bell reclaims the full width. Same breakpoint switch as
   * `OrganizationSwitcher`'s `menuSide`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'center' | 'end'>}
   */
  protected readonly panelAlign: Signal<'center' | 'end'> = computed((): 'center' | 'end' =>
    this.sidebar.isMobile() ? 'center' : 'end',
  );

  /**
   * Property hasUnread
   * @readonly
   *
   * @description
   * Whether the dot shows. Reads the inbox count, not the loaded entities.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasUnread: Signal<boolean> = computed(
    (): boolean => this.store.unreadCount() > 0,
  );

  /**
   * Property unreadLabel
   * @readonly
   *
   * @description
   * The count as shown in the menu header, capped at `99+`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly unreadLabel: Signal<string> = computed((): string => {
    const count: number = this.store.unreadCount();

    return count > UNREAD_DISPLAY_CEILING ? `${UNREAD_DISPLAY_CEILING}+` : `${count}`;
  });

  /**
   * Property triggerLabel
   * @readonly
   *
   * @description
   * The trigger's accessible name, carrying the count so the dot is never the
   * only bearer of the information.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly triggerLabel: Signal<string> = computed((): string => {
    const count: number = this.store.unreadCount();
    if (count === 0) return $localize`:@@account.notificationBell.triggerIdle:Notifications`;

    const unread: string = this.unreadLabel();

    return $localize`:@@account.notificationBell.trigger:Notifications, ${unread}:unread: unread`;
  });
  //#endregion

  //#region Methods
  /**
   * Method onPanelState
   * @method onPanelState
   *
   * @description
   * Fetches the feed the first time the panel is opened, and only if nothing is
   * loaded, in flight, or already failed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {'closed' | 'open'} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onPanelState(state: 'closed' | 'open'): void {
    if (state !== 'open') return;

    if (
      this.store.notifications().length > 0 ||
      this.store.isLoading() ||
      this.store.listError() !== null
    ) {
      return;
    }

    this.store.load();
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Marks one notification read in place. The panel stays open: there is no
   * per-notification route to send the user to.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NotificationOutput} notification - The notification that was clicked.
   *
   * @returns {void}
   */
  protected markRead(notification: NotificationOutput): void {
    if (notification.isRead) return;

    this.store.markAsRead(notification.id);
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-runs the feed request after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.load();
  }

  /**
   * Method relativeTime
   * @method relativeTime
   *
   * @description
   * Turns a timestamp into "3 hours ago", through `Intl.RelativeTimeFormat`.
   * Anything under a rounded minute reads "Just now": comparing against the raw
   * threshold let 59.7s miss the minute branch and render as "60 seconds ago".
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
      if (Math.round(Math.abs(elapsed) / seconds) >= 1) {
        return format.format(Math.round(elapsed / seconds), unit);
      }
    }

    return $localize`:@@account.notificationBell.justNow:Just now`;
  }
  //#endregion
}
