import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  type Signal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideBellOff, lucideTriangleAlert } from '@ng-icons/lucide';
import type {
  NotificationPreferenceOutput,
  NotificationTypeOutput,
} from '@features/account/models';
import { AccountNotificationPreferencesStore, NotificationStore } from '@features/account/state';
import {
  AccountNotificationPreferencesForm,
  type AccountNotificationPreferenceRow,
  type AccountNotificationPreferenceToggle,
} from '@features/account/ui/forms/account-notification-preferences-form';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmCardTitle } from '@shared/ui/card';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AccountNotificationPreferencesPage
 * @class AccountNotificationPreferencesPage
 *
 * @description
 * The notification preferences screen: a category × channel matrix where
 * each switch commits immediately. The category list is derived from the
 * type catalog (`GET /api/notification-types`) the notification center
 * already loads — never hard-coded, so a category added server-side appears
 * here without a frontend change.
 *
 * A category with no customization is enabled on every channel; the page
 * merges the server's explicit rows over that default and says so in its
 * help text.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-notification-preferences-page',
  imports: [
    HlmCardTitle,
    AccountNotificationPreferencesForm,
    EmptyState,
    ErrorState,
    HlmButton,
    HlmSkeleton,
  ],
  providers: [
    AccountNotificationPreferencesStore,
    provideIcons({ lucideBellOff, lucideTriangleAlert }),
  ],
  templateUrl: './account-notification-preferences-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationPreferencesPage implements OnInit {
  //#region Properties
  /**
   * Property notificationStore
   * @readonly
   *
   * @description
   * Root-provided notification state, read here for the type catalog the
   * category list derives from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationStore}
   */
  protected readonly notificationStore: NotificationStore =
    inject<NotificationStore>(NotificationStore);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped preferences state: the customized rows and the in-flight
   * commit.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AccountNotificationPreferencesStore}
   */
  protected readonly store: AccountNotificationPreferencesStore =
    inject<AccountNotificationPreferencesStore>(AccountNotificationPreferencesStore);

  /**
   * Property categories
   * @readonly
   *
   * @description
   * The distinct categories the type catalog names, sorted so the matrix
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
        ...new Set(
          this.notificationStore
            .types()
            .map((type: NotificationTypeOutput): string => type.category),
        ),
      ].toSorted(),
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * The matrix rows: every known category with the server's explicit
   * customization merged over the "everything enabled" default.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<AccountNotificationPreferenceRow>>}
   */
  protected readonly rows: Signal<ReadonlyArray<AccountNotificationPreferenceRow>> = computed(
    (): ReadonlyArray<AccountNotificationPreferenceRow> => {
      const customized: ReadonlyMap<string, NotificationPreferenceOutput> = new Map(
        this.store
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
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether either half of the matrix — the type catalog or the customized
   * rows — is still on its way and nothing is on screen yet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed(
    (): boolean =>
      this.rows().length === 0 &&
      (this.store.isLoading() || !this.notificationStore.typesLoaded()) &&
      this.store.loadError() === null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads the type catalog backing the category list (the store skips the
   * call once the catalog is loaded) and the customized preference set.
   * Browser-only secondary data by nature — a settings matrix is not worth
   * an SSR round trip (`ARCHITECTURE.md` §12.5).
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.notificationStore.loadTypes();
    this.store.load();
  }
  //#endregion

  //#region Methods
  /**
   * Method retry
   * @method retry
   *
   * @description
   * Reloads the customized preference set after a failed load.
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
    this.store.save({
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
   * spaces and the first letter is capitalized (`non_conformity` → "Non
   * conformity"). There is no category label registry to reuse — the
   * notification center renders raw identifiers — so this stays a plain
   * presentation fallback.
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
