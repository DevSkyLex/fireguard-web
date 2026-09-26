import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideAtSign, lucideBell } from '@ng-icons/lucide';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { InboxItemOutput } from '@features/account/models';
import { displayInboxTitle } from '@features/account/utils/inbox-item-title';
import { InboxStore, type InboxStoreType } from '@features/account/state';
import { inboxConversationLink } from '@features/account/utils/inbox-link';
import { SLOT_PRESENTATION, type SlotPresentation } from '@shared/layout-slot';
import { HlmButton } from '@shared/ui/button';
import { HlmDrawerImports } from '@shared/ui/drawer';
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
 * Shared unified inbox preview in a native desktop popover or mobile drawer.
 * The badge comes from the scope-matched server count. Entries load lazily and
 * source events refresh them. Notification reads keep the panel open; mention
 * navigation closes it and leaves conversation acknowledgement to Messaging.
 * This slot root orchestrates its account-owned store, as documented in FEATURE.md.
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
    NgTemplateOutlet,
    HlmDrawerImports,
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
  providers: [provideIcons({ lucideArrowRight, lucideAtSign, lucideBell })],
  templateUrl: './notification-bell.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Central interaction mode; viewport width only controls geometry.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  //#region Properties
  /**
   * Property slotPresentation
   * @readonly
   *
   * @description
   * Presentation requested by the layout slot hosting this notification
   * trigger. The mobile drawer uses a Spartan item row; desktop keeps the
   * compact icon button.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {SlotPresentation}
   */
  protected readonly slotPresentation: SlotPresentation =
    inject<SlotPresentation>(SLOT_PRESENTATION);

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
   * @type {InboxStoreType}
   */
  protected readonly store: InboxStoreType = inject(InboxStore);

  /**
   * Property inboxTitle
   * @readonly
   * @description Localizes source-owned titles that the API intentionally keeps language-neutral.
   * @access protected
   * @since 1.0.0
   * @type {typeof displayInboxTitle}
   */
  protected readonly inboxTitle: typeof displayInboxTitle = displayInboxTitle;

  /**
   * Property panelState
   * @readonly
   * @description Native overlay state, closed after opening a conversation.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<'open' | 'closed'>}
   */
  protected readonly panelState: WritableSignal<'open' | 'closed'> = signal<'open' | 'closed'>(
    'closed',
  );

  /**
   * Property router
   * @readonly
   * @description Opens the source-owned conversation route.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

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

  /**
   * Method isMention
   * @description Identifies the collaboration mention source for its icon and title treatment.
   * @access protected
   * @since 1.0.0
   * @param {InboxItemOutput} item - The source-owned inbox item.
   * @returns {boolean} Whether this item is a conversation mention.
   */
  protected isMention(item: InboxItemOutput): boolean {
    return item.sourceKey === 'messaging.mention' && item.kind === 'mention';
  }
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
    this.panelState.set(state);
    if (state !== 'open') return;

    if (
      this.store.entryEntities().length > 0 ||
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
   * Opens a mention's conversation, or acknowledges a notification in place.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InboxItemOutput} notification - The source entry that was clicked.
   *
   * @returns {void}
   */
  protected markRead(notification: InboxItemOutput): void {
    const link = inboxConversationLink(notification);
    if (link) {
      void this.router.navigate([...link]).then((opened) => {
        if (opened) this.panelState.set('closed');
      });
      return;
    }
    if (notification.isRead) return;

    this.store.markAsRead(notification);
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
