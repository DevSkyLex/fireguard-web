import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { map } from 'rxjs';
import { AccountAccessPanel } from '../../components/account-access-panel/account-access-panel.component';
import { AccountMfaPanel } from '../../components/account-mfa-panel/account-mfa-panel.component';
import { AccountProfilePanel } from '../../components/account-profile-panel/account-profile-panel.component';
import { AccountSessionsPanel } from '../../components/account-sessions-panel/account-sessions-panel.component';
import { AccountTrustedDevicesPanel } from '../../components/account-trusted-devices-panel/account-trusted-devices-panel.component';
import { ACCOUNT_TABS } from './constants';
import { type AccountTab } from './models';

/**
 * Selectable entry rendered in the account page's horizontal tab strip.
 */
interface AccountTabItem {
  /** Tab identifier persisted in the `tab` query parameter. */
  readonly value: AccountTab;
  /** Human-readable tab label. */
  readonly label: string;
}

/**
 * Page AccountPage
 * @class AccountPage
 *
 * @description
 * Single entry page for the authenticated user's account. Presents a
 * horizontal tab strip switching between the profile, security (MFA, active
 * sessions and trusted devices) and roles sections. The active tab is
 * synchronized with the `tab` query parameter so header menu entries can
 * deep-link into a section; the legacy `access` value keeps resolving to the
 * renamed "roles" tab.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-page',
  imports: [
    TabsModule,
    AccountAccessPanel,
    AccountProfilePanel,
    AccountMfaPanel,
    AccountSessionsPanel,
    AccountTrustedDevicesPanel,
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
   * Property activeTab
   * @readonly
   *
   * @description
   * Currently selected account section derived from the `tab` query
   * parameter. The retired `access` identifier resolves to `roles` so
   * existing deep links keep working.
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
        if (tab === 'access') return 'roles';
        return tab !== null && ACCOUNT_TABS.has(tab) ? (tab as AccountTab) : 'profile';
      }),
    ),
    { initialValue: 'profile' },
  );

  /**
   * Property tabItems
   * @readonly
   *
   * @description
   * Account sections rendered as entries in the horizontal tab strip.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {ReadonlyArray<AccountTabItem>}
   */
  protected readonly tabItems: ReadonlyArray<AccountTabItem> = [
    { value: 'profile', label: $localize`:@@account.tabs.profile:Profile` },
    { value: 'security', label: $localize`:@@account.tabs.security:Security` },
    { value: 'roles', label: $localize`:@@account.tabs.roles:Roles` },
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
