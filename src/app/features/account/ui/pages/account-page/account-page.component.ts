import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { map } from 'rxjs';
import { NotificationStore, UserStore } from '@features/account/state';
import { AccountNotificationsPanel } from '../../components/account-notifications-panel/account-notifications-panel.component';
import { AccountProfilePanel } from '../../components/account-profile-panel/account-profile-panel.component';
import { AccountSessionsPanel } from '../../components/account-sessions-panel/account-sessions-panel.component';
import { AccountTrustedDevicesPanel } from '../../components/account-trusted-devices-panel/account-trusted-devices-panel.component';
import { ACCOUNT_TABS, type AccountNavItem, type AccountTab } from './models';

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
    DividerModule,
    MenuModule,
    TagModule,
    AccountProfilePanel,
    AccountSessionsPanel,
    AccountTrustedDevicesPanel,
    AccountNotificationsPanel,
  ],
  templateUrl: './account-page.component.html',
  styles: `
    :host ::ng-deep .account-nav-item-active > .p-menu-item-content {
      position: relative;
      background: var(--p-menu-item-focus-background);
      font-weight: 600;
    }

    :host ::ng-deep .account-nav-item-active > .p-menu-item-content::before {
      content: '';
      position: absolute;
      left: -0.5rem;
      top: 0.375rem;
      bottom: 0.375rem;
      width: 0.25rem;
      border-radius: 9999px;
      background: var(--p-primary-color);
    }
  `,
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
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

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
  private readonly router: Router = inject(Router);

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
  protected readonly notificationStore: NotificationStore = inject(NotificationStore);

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
      label: 'Public profile',
      icon: 'pi pi-user',
      description: 'Manage how your profile appears to other members.',
    },
    {
      id: 'security',
      label: 'Sessions & security',
      icon: 'pi pi-shield',
      description: 'Review your active sessions and the devices you trust.',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'pi pi-bell',
      description: 'Choose how and when you want to be notified.',
    },
  ];

  /**
   * Property activeNavItem
   * @readonly
   *
   * @description
   * Navigation entry matching the active tab, used for the section heading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<AccountNavItem>}
   */
  protected readonly activeNavItem: Signal<AccountNavItem> = computed(
    () => this.navItems.find((item) => item.id === this.activeTab()) ?? this.navItems[0],
  );

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
        styleClass: this.activeTab() === item.id ? 'account-nav-item-active' : undefined,
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
