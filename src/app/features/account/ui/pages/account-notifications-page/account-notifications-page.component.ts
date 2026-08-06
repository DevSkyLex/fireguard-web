import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  type Signal,
} from '@angular/core';
import type { NotificationTypeOutput } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { AccountNotificationList } from '@features/account/ui/components/account-notification-list';

/**
 * Component AccountNotificationsPage
 * @class AccountNotificationsPage
 *
 * @description
 * The notification feed, filtered by category and paged on demand.
 *
 * `NotificationStore` is root-provided and already primed by the account
 * provider, so this loads the type catalog it needs for the filters and
 * otherwise reads what is there rather than refetching it.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-notifications-page',
  imports: [AccountNotificationList],
  templateUrl: './account-notifications-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationsPage implements OnInit {
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
   * Property categories
   * @readonly
   *
   * @description
   * The distinct categories the type catalog names, sorted so the filter row
   * does not reorder itself between loads.
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
   * The category currently filtered on, or `null` for all of them.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly activeCategory: Signal<string | null> = computed(
    (): string | null => this.store.activeFilter()?.category ?? null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads the type catalog backing the filter row. Browser-only secondary data
   * by nature — a filter the reader has not reached for is not worth an SSR
   * round trip (`ARCHITECTURE.md` §12.5) — and the store skips the call once
   * the catalog is loaded.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.store.loadTypes();
  }
  //#endregion

  //#region Methods
  /**
   * Method filterByCategory
   * @method filterByCategory
   *
   * @description
   * Applies or clears the category filter and reloads the first page.
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
  //#endregion
}
