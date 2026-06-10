import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BadgeModule } from 'primeng/badge';
import { map } from 'rxjs';
import { NotificationStore } from '@features/account/state';
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
    BadgeModule,
    AccountProfilePanel,
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
    { id: 'profile', label: 'Profile', icon: 'pi pi-user' },
    { id: 'security', label: 'Security', icon: 'pi pi-shield' },
    { id: 'notifications', label: 'Notifications', icon: 'pi pi-bell' },
  ];

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
