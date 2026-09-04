import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBellOff, lucideTriangleAlert } from '@ng-icons/lucide';
import type {
  NotificationPreferenceOutput,
  NotificationTypeOutput,
} from '@features/account/models';
import { AccountNotificationPreferencesStore, NotificationStore } from '@features/account/state';
import { AccountNotificationList } from '@features/account/ui/components/account-notification-list';
import {
  AccountNotificationPreferencesForm,
  type AccountNotificationPreferenceRow,
  type AccountNotificationPreferenceToggle,
} from '@features/account/ui/forms/account-notification-preferences-form';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTabsImports } from '@shared/ui/tabs';
import { ACCOUNT_NOTIFICATIONS_TAB_IDS } from './constants';
import type { AccountNotificationsTabId } from './models';

/**
 * Component AccountNotificationsPage
 * @class AccountNotificationsPage
 *
 * @description
 * Everything about notifications in one screen: the feed that arrived, and the
 * category by channel matrix deciding what arrives next. The two used to be
 * separate routes; they share the same type catalog and the same mental model,
 * and splitting them put "stop sending me these" a navigation away from
 * "read these".
 *
 * The open half lives in `?tab=`, so either can be linked to. The matrix loads
 * its rows only when its pane first renders — a reader who only reads the feed
 * never pays for that request.
 *
 * `NotificationStore` is root-provided and already primed by the account
 * provider, so this reads what is there rather than refetching it.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-notifications-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    AccountNotificationList,
    AccountNotificationPreferencesForm,
    HlmButton,
    HlmSkeleton,
    ...HlmTabsImports,
  ],
  providers: [
    AccountNotificationPreferencesStore,
    provideIcons({ lucideBellOff, lucideTriangleAlert }),
  ],
  templateUrl: './account-notifications-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationsPage implements OnInit {
  //#region Inputs
  /**
   * Property tab
   * @readonly
   *
   * @description
   * The raw `?tab=` query parameter, bound by the router's component input
   * binding.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly tab: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Root-provided notification state: the feed, its paging, and the live
   * Mercure stream feeding it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationStore}
   */
  protected readonly store: NotificationStore = inject<NotificationStore>(NotificationStore);

  /**
   * Property preferencesStore
   * @readonly
   *
   * @description
   * Page-scoped preferences state: the customized rows and the in-flight
   * commit.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {AccountNotificationPreferencesStore}
   */
  protected readonly preferencesStore: AccountNotificationPreferencesStore =
    inject<AccountNotificationPreferencesStore>(AccountNotificationPreferencesStore);

  /**
   * Property route
   * @readonly
   *
   * @description Keeps tab navigation relative to this route.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description Writes the `?tab=` query parameter.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property activeTab
   * @readonly
   *
   * @description
   * {@link tab} narrowed to a known id, falling back to the feed for a missing
   * or unrecognized value.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<AccountNotificationsTabId>}
   */
  protected readonly activeTab: Signal<AccountNotificationsTabId> = computed(
    (): AccountNotificationsTabId => {
      const requested: string | undefined = this.tab();

      return requested !== undefined &&
        (ACCOUNT_NOTIFICATIONS_TAB_IDS as ReadonlyArray<string>).includes(requested)
        ? (requested as AccountNotificationsTabId)
        : 'inbox';
    },
  );

  /**
   * Property categories
   * @readonly
   *
   * @description
   * The distinct categories the type catalog names, sorted so neither the
   * filter row nor the matrix reorders itself between loads.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  protected readonly categories: Signal<ReadonlyArray<string>> = computed(
    (): ReadonlyArray<string> =>
      [
        ...new Set(this.store.types().map((type: NotificationTypeOutput): string => type.category)),
      ].toSorted(),
  );

  /**
   * Property activeCategory
   * @readonly
   *
   * @description
   * The category the feed is filtered on, or `null` for all of them.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly activeCategory: Signal<string | null> = computed(
    (): string | null => this.store.activeFilter()?.category ?? null,
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * The matrix rows: every known category with the server's explicit
   * customization merged over the everything-enabled default.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<AccountNotificationPreferenceRow>>}
   */
  protected readonly rows: Signal<ReadonlyArray<AccountNotificationPreferenceRow>> = computed(
    (): ReadonlyArray<AccountNotificationPreferenceRow> => {
      const customized: ReadonlyMap<string, NotificationPreferenceOutput> = new Map(
        this.preferencesStore
          .preferences()
          .map(
            (preference: NotificationPreferenceOutput): [string, NotificationPreferenceOutput] => [
              preference.category,
              preference,
            ],
          ),
      );

      return this.categories().map((category: string): AccountNotificationPreferenceRow => {
        const preference: NotificationPreferenceOutput | undefined = customized.get(category);

        return {
          category,
          label: this.humanize(category),
          emailEnabled: preference?.emailEnabled ?? true,
          mercureEnabled: preference?.mercureEnabled ?? true,
        };
      });
    },
  );

  /**
   * Property preferencesLoading
   * @readonly
   *
   * @description
   * Whether either half of the matrix — the type catalog or the customized
   * rows — is still on its way and nothing is on screen yet.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly preferencesLoading: Signal<boolean> = computed(
    (): boolean =>
      this.rows().length === 0 &&
      (this.preferencesStore.isLoading() || !this.store.typesLoaded()) &&
      this.preferencesStore.loadError() === null,
  );

  /**
   * Property preferencesRequested
   *
   * @description
   * Whether the matrix has already been asked for. The pane is lazy, but the
   * tab can be re-entered any number of times and the store's `load` has no
   * guard of its own.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {boolean}
   */
  private preferencesRequested: boolean = false;
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   *
   * @description
   * Fetches the matrix the first time its tab opens, never on arrival at the
   * feed (`AGENTS.md`: secondary UI data loads on user action).
   *
   * @access public
   * @since 1.2.0
   */
  public constructor() {
    effect((): void => {
      if (this.activeTab() !== 'preferences' || this.preferencesRequested) return;

      this.preferencesRequested = true;
      this.preferencesStore.load();
    });
  }

  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads the type catalog both panes derive their categories from (the store
   * skips the call once it is loaded). Browser-only secondary data by nature —
   * a filter row the reader has not reached for is not worth an SSR round trip
   * (`ARCHITECTURE.md` §12.5).
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.store.loadTypes();
    this.store.loadUnreadCount();
  }
  //#endregion

  //#region Methods
  /**
   * Method onTabActivated
   * @method onTabActivated
   *
   * @description
   * Writes the opened tab to `?tab=`, replacing the history entry so switching
   * panes does not stack up back-button steps.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} tabId - The activated tab's id.
   *
   * @returns {void}
   */
  protected onTabActivated(tabId: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method filterByCategory
   * @method filterByCategory
   *
   * @description
   * Applies or clears the feed's category filter and reloads the first page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} category - The category to filter on, or `null` for all.
   *
   * @returns {void}
   */
  protected filterByCategory(category: string | null): void {
    this.store.setFilter(category ? { category } : null);
  }

  /**
   * Method loadPreferences
   * @method loadPreferences
   *
   * @description
   * Fetches the customized preference set. Called when the matrix pane first
   * renders rather than on arrival, so a reader who only reads the feed never
   * pays for the request.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected loadPreferences(): void {
    this.preferencesStore.load();
  }

  /**
   * Method commit
   * @method commit
   *
   * @description
   * Persists one flipped row immediately — each switch is its own commit.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AccountNotificationPreferenceToggle} toggle - The complete row values after the flip.
   *
   * @returns {void}
   */
  protected commit(toggle: AccountNotificationPreferenceToggle): void {
    this.preferencesStore.save({
      preferences: [
        {
          category: toggle.category,
          emailEnabled: toggle.emailEnabled,
          mercureEnabled: toggle.mercureEnabled,
        },
      ],
    });
  }

  /**
   * Method humanize
   * @method humanize
   *
   * @description
   * Turns a raw category identifier into a readable label: separators become
   * spaces and the first letter is capitalized (`non_conformity` becomes "Non
   * conformity"). There is no category label registry to reuse — the feed
   * renders raw identifiers — so this stays a plain presentation fallback.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} category - The raw category identifier.
   *
   * @returns {string} The human-readable label.
   */
  private humanize(category: string): string {
    const spaced: string = category.replaceAll(/[._-]/g, ' ').trim();
    return spaced.length === 0 ? category : spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }
  //#endregion
}
