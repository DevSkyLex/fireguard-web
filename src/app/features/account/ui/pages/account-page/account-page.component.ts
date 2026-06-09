import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BadgeModule } from 'primeng/badge';
import { map } from 'rxjs';
import { NotificationStore } from '@features/account/state';
import { AccountNotificationsPanel } from '../../components/account-notifications-panel/account-notifications-panel.component';
import { AccountProfileHeader } from '../../components/account-profile-header/account-profile-header.component';
import { AccountProfilePanel } from '../../components/account-profile-panel/account-profile-panel.component';
import { AccountSessionsPanel } from '../../components/account-sessions-panel/account-sessions-panel.component';
import { AccountTrustedDevicesPanel } from '../../components/account-trusted-devices-panel/account-trusted-devices-panel.component';

/** Identifier of an account page tab. */
type AccountTab = 'profile' | 'security' | 'notifications';

/** A selectable section rendered in the vertical navigation menu. */
interface AccountNavItem {
  /** Tab identifier persisted in the `tab` query parameter. */
  readonly id: AccountTab;
  /** Human-readable label shown in the menu. */
  readonly label: string;
  /** PrimeNG icon class shown before the label. */
  readonly icon: string;
}

/** Tab identifiers accepted from the `tab` query parameter. */
const ACCOUNT_TABS: ReadonlySet<string> = new Set<AccountTab>([
  'profile',
  'security',
  'notifications',
]);

/**
 * Page AccountPage
 * @class AccountPage
 *
 * @description
 * Single entry page for the authenticated user's account. Presents a profile
 * hero header followed by a sticky vertical navigation menu that switches
 * between the profile, security (active sessions and trusted devices) and
 * notifications sections. The active section is synchronised with the `tab`
 * query parameter so header menu entries can deep-link into a section.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-page',
  imports: [
    BadgeModule,
    AccountProfileHeader,
    AccountProfilePanel,
    AccountSessionsPanel,
    AccountTrustedDevicesPanel,
    AccountNotificationsPanel,
  ],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  /** Active route used to read and update the selected tab. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  /** Router used to persist the selected tab in the URL. */
  private readonly router: Router = inject(Router);
  /** Notification store providing the unread badge state. */
  protected readonly notificationStore: NotificationStore = inject(NotificationStore);

  /** Currently selected tab, derived from the `tab` query parameter. */
  protected readonly activeTab: Signal<AccountTab> = toSignal(
    this.route.queryParamMap.pipe(
      map((params): AccountTab => {
        const tab: string | null = params.get('tab');
        return tab !== null && ACCOUNT_TABS.has(tab) ? (tab as AccountTab) : 'profile';
      }),
    ),
    { initialValue: 'profile' },
  );

  /** Sections rendered as entries in the vertical navigation menu. */
  protected readonly navItems: ReadonlyArray<AccountNavItem> = [
    { id: 'profile', label: 'Profile', icon: 'pi pi-user' },
    { id: 'security', label: 'Security', icon: 'pi pi-shield' },
    { id: 'notifications', label: 'Notifications', icon: 'pi pi-bell' },
  ];

  /** Persists the selected tab in the `tab` query parameter. */
  protected onTabChange(value: string | number | undefined): void {
    if (value === undefined) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: value },
      queryParamsHandling: 'merge',
    });
  }
}
