import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type { InboxItem } from '@features/account/models';
import { InboxStore, type InboxStoreType } from '@features/account/state';
import { EmptyState, ErrorState, Skeleton } from '@shared/components';

/** Where an inbox entry links to, by the target it names. */
const TARGET_ROUTE: Readonly<Record<string, string>> = {
  intervention: 'interventions',
  inspection: 'inspections',
  facility: 'facilities',
  equipment: 'equipments',
  conversation: 'messages',
};

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
    const segment: string | undefined = TARGET_ROUTE[item.targetType];
    if (segment === undefined || item.organizationId === null) return;

    void this.router.navigate(['/organizations', item.organizationId, segment, item.targetId]);
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
