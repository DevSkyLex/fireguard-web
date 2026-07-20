import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type { InboxItem } from '@features/account/models';
import { InboxStore, type InboxStoreType } from '@features/account/state';
import { EmptyState, ErrorState, Skeleton } from '@shared/components';

/**
 * The `targetType` values the API actually emits.
 *
 * Exactly two sources feed the inbox: the Notification module
 * (`targetType: 'notification'`) and Messaging mentions
 * (`targetType: 'conversation'`). The map used to list intervention,
 * inspection, facility and equipment — none of which the backend ever sends —
 * while omitting `notification`, the dominant source, so nearly every row was
 * inert.
 *
 * @since 1.1.0
 */
type InboxTargetType = 'notification' | 'conversation';

/**
 * Component InboxPage
 * @class InboxPage
 *
 * @description
 * Everything needing the signed-in user's attention, merged across sources and
 * organizations.
 *
 * Lives in `features/account`, not under an organization: an inbox item's
 * `organizationId` is optional, so an account-level item has no organization to
 * be nested under.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inbox',
  imports: [
    DatePipe,
    ButtonModule,
    ToggleSwitchModule,
    FormsModule,
    EmptyState,
    ErrorState,
    Skeleton,
  ],
  providers: [InboxStore],
  templateUrl: './inbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InboxStoreType}
   */
  protected readonly store: InboxStoreType = inject<InboxStoreType>(InboxStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);
  //#endregion

  //#region Lifecycle
  /**
   * Loads the first page across every organization.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.load();
  }
  //#endregion

  //#region Methods
  /**
   * Method open
   *
   * @description
   * Navigates to the record an entry points at. An account-level item has no
   * organization to route into, so it stays inert rather than guessing one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InboxItem} item - The entry to open.
   *
   * @returns {void}
   */
  protected open(item: InboxItem): void {
    const targetType: InboxTargetType | null =
      item.targetType === 'notification' || item.targetType === 'conversation'
        ? item.targetType
        : null;

    if (targetType === null) return;

    if (targetType === 'notification') {
      // A notification has no page of its own; its home is the account's
      // notification list. It is also the one target that exists outside any
      // organization.
      void this.router.navigate(['/account'], { queryParams: { tab: 'notifications' } });
      return;
    }

    if (item.organizationId === null) return;

    // The workspace opens a thread through `?conversation=`, never as a path
    // segment — `/messages/<id>` is not a route.
    void this.router.navigate(['/organizations', item.organizationId, 'messages'], {
      queryParams: { conversation: item.targetId },
    });
  }

  /**
   * Method loadMore
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected loadMore(): void {
    this.store.loadMore();
  }

  /**
   * Method retry
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.load();
  }
  //#endregion
}
