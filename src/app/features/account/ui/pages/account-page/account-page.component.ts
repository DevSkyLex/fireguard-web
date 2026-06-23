import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { MenuModule, type MenuPassThroughOptions } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { map } from 'rxjs';
import { NotificationStore, UserStore } from '@features/account/state';
import { AccountNotificationsPanel } from '../../components/account-notifications-panel/account-notifications-panel.component';
import { AccountProfilePanel } from '../../components/account-profile-panel/account-profile-panel.component';
import { AccountSessionsPanel } from '../../components/account-sessions-panel/account-sessions-panel.component';
import { AccountSettingsPanel } from '../../components/account-settings-panel/account-settings-panel.component';
import { AccountTrustedDevicesPanel } from '../../components/account-trusted-devices-panel/account-trusted-devices-panel.component';
import { ACCOUNT_TABS } from './constants';
import { type AccountNavItem, type AccountTab } from './models';

/**
 * Page AccountPage
 * @class AccountPage
 *
 * @description
 * Single entry page for the authenticated user's account. Presents a sticky
 * vertical navigation menu that switches between the profile, security
 * (active sessions and trusted devices) and notifications sections. The
 * active section is synchronized with the `tab` query parameter so header
 * menu entries can deep-link into a section.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-page',
  imports: [
    DatePipe,
    AvatarModule,
    CardModule,
    DividerModule,
    MenuModule,
    TagModule,
    AccountProfilePanel,
    AccountSettingsPanel,
    AccountSessionsPanel,
    AccountTrustedDevicesPanel,
    AccountNotificationsPanel,
  ],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  //#region Properties
  /**
   * Property route
   * @readonly
   *
   * @description
   * Active route used to read and update the selected account tab.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to persist the selected tab in the URL.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property notificationStore
   * @readonly
   *
   * @description
   * Notification store providing the unread badge state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationStore}
   */
  protected readonly notificationStore: NotificationStore =
    inject<NotificationStore>(NotificationStore);

  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Authenticated-user profile store backing the page header (avatar,
   * display name, username and account metadata).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Property activeTab
   * @readonly
   *
   * @description
   * Currently selected account section derived from the `tab` query parameter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<AccountTab>}
   */
  protected readonly activeTab: Signal<AccountTab> = toSignal(
    this.route.queryParamMap.pipe(
      map((params): AccountTab => {
        const tab: string | null = params.get('tab');
        return tab !== null && ACCOUNT_TABS.has(tab) ? (tab as AccountTab) : 'profile';
      }),
    ),
    { initialValue: 'profile' },
  );

  /**
   * Property navItems
   * @readonly
   *
   * @description
   * Account sections rendered as entries in the vertical navigation menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ReadonlyArray<AccountNavItem>}
   */
  protected readonly navItems: ReadonlyArray<AccountNavItem> = [
    {
      id: 'profile',
      label: $localize`:@@account.nav.profileLabel:Public profile`,
      icon: 'pi pi-user',
      description: $localize`:@@account.nav.profileDesc:Manage how your profile appears to other members.`,
    },
    {
      id: 'settings',
      label: $localize`:@@account.nav.settingsLabel:Settings`,
      icon: 'pi pi-cog',
      description: $localize`:@@account.nav.settingsDesc:Language and display preferences.`,
    },
    {
      id: 'security',
      label: $localize`:@@account.menu.sessionsSecurity:Sessions & security`,
      icon: 'pi pi-shield',
      description: $localize`:@@account.nav.securityDesc:Review your active sessions and the devices you trust.`,
    },
    {
      id: 'notifications',
      label: $localize`:@@common.notifications:Notifications`,
      icon: 'pi pi-bell',
      description: $localize`:@@account.nav.notificationsDesc:Account and organization activity in one place.`,
    },
  ];

  /**
   * Property activeSection
   * @readonly
   *
   * @description
   * Navigation entry matching the active tab, used to render the section card
   * header (title and description) consistently across every section.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<AccountNavItem>}
   */
  protected readonly activeSection: Signal<AccountNavItem> = computed(
    () => this.navItems.find((item) => item.id === this.activeTab()) ?? this.navItems[0],
  );

  /**
   * Property headerAvatarPt
   * @readonly
   *
   * @description
   * Pass-through options of the header avatar: larger rounded surface with
   * a subtle ring, matching the GitHub-profile-style header.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AvatarPassThroughOptions}
   */
  protected readonly headerAvatarPt: AvatarPassThroughOptions = {
    root: {
      class:
        'h-16 w-16 text-xl ring-1 ring-surface-200 dark:ring-surface-700 ring-offset-2 ring-offset-surface-0 dark:ring-offset-surface-950',
    },
  };

  /**
   * Property navMenuPt
   * @readonly
   *
   * @description
   * Pass-through options of the section navigation menu: borderless,
   * transparent and full-width to blend into the page like a settings
   * sidebar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MenuPassThroughOptions}
   */
  protected readonly navMenuPt: MenuPassThroughOptions = {
    root: { class: 'w-full border-0 bg-transparent p-0' },
    list: { class: 'flex flex-col gap-0.5 p-0' },
    itemIcon: { class: 'text-surface-500 dark:text-surface-400' },
  };

  /**
   * Property sectionCardPt
   * @readonly
   *
   * @description
   * Pass-through options of the section content card, matching the
   * bordered flat surface used by the account tables.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly sectionCardPt: CardPassThroughOptions = {
    root: {
      class:
        'border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: { class: 'p-6' },
  };

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * PrimeNG menu model derived from the account sections. Reflects the
   * active tab and the unread-notifications badge reactively.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed(() =>
    this.navItems.map(
      (item): MenuItem => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        badge:
          item.id === 'notifications' && this.notificationStore.hasUnread()
            ? String(this.notificationStore.unreadCount())
            : undefined,
        styleClass:
          this.activeTab() === item.id
            ? 'relative before:absolute before:-left-2 before:inset-y-1.5 before:w-1 before:rounded-full before:bg-primary ' +
              '[&>.p-menu-item-content]:bg-surface-100 dark:[&>.p-menu-item-content]:bg-surface-800 ' +
              '[&_.p-menu-item-label]:font-semibold [&_.p-menu-item-label]:text-surface-900 dark:[&_.p-menu-item-label]:text-surface-50'
            : undefined,
        command: (): void => this.onTabChange(item.id),
      }),
    ),
  );

  //#endregion

  //#region Methods
  /**
   * Method onTabChange
   * @method onTabChange
   *
   * @description
   * Persists the selected account section in the `tab` query parameter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | number | undefined} value - Selected tab identifier.
   * @returns {void}
   */
  protected onTabChange(value: string | number | undefined): void {
    if (value === undefined) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: value },
      queryParamsHandling: 'merge',
    });
  }
  //#endregion
}
