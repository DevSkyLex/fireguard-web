import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { ConnectivityService } from '@core/connectivity';
import { MessagingSyncCoordinatorService } from '@features/collaboration/services';

/**
 * Component MessagingSyncChip
 * @class MessagingSyncChip
 *
 * @description
 * The workspace's offline surface for messaging: whether the connection is
 * down, how much is waiting to be sent, and whether anything gave up.
 *
 * It renders nothing when there is nothing to say, which is the common case —
 * a permanent indicator that usually reads "fine" trains people to stop
 * reading it.
 *
 * It lives in the conversation header because that is the only shell slot that
 * exists today. A full-width banner, which `PRODUCT.md` would arguably prefer,
 * would need a new layout slot.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-messaging-sync-chip />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-messaging-sync-chip',
  imports: [TooltipModule],
  templateUrl: './messaging-sync-chip.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingSyncChip {
  //#region Properties
  /**
   * Property connectivity
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  protected readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property coordinator
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MessagingSyncCoordinatorService}
   */
  protected readonly coordinator: MessagingSyncCoordinatorService = inject(
    MessagingSyncCoordinatorService,
  );

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether there is anything worth saying: offline, work queued, or work that
   * gave up.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly visible: Signal<boolean> = computed(
    (): boolean =>
      this.connectivity.offline() ||
      this.coordinator.pendingCount() > 0 ||
      this.coordinator.failedCount() > 0,
  );
  //#endregion
}
