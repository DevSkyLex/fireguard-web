import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule, type PopoverPassThroughOptions } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';

/**
 * Component InterventionSyncChip
 * @class InterventionSyncChip
 *
 * @description
 * Topbar chip surfacing connectivity and offline-sync status: offline,
 * blocked operations, in-flight sync, pending local changes, or up to date.
 * The pill stays neutral — only the icon carries the severity colour — and
 * opens a panel with the queue summary and a manual "Sync now" action.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-sync-chip />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-sync-chip',
  imports: [ButtonModule, PopoverModule, TooltipModule],
  templateUrl: './intervention-sync-chip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSyncChip {
  //#region Properties
  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Core connectivity source of truth (never `navigator.onLine` directly).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  protected readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Offline persistence facade exposing the outbox pending state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  protected readonly offline: InterventionOfflineService = inject<InterventionOfflineService>(
    InterventionOfflineService,
  );

  /**
   * Property sync
   * @readonly
   *
   * @description
   * Sync coordinator exposing the replay state and manual sync entry points.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionSyncCoordinatorService}
   */
  protected readonly sync: InterventionSyncCoordinatorService =
    inject<InterventionSyncCoordinatorService>(InterventionSyncCoordinatorService);

  /**
   * Property popover
   * @readonly
   *
   * @description
   * Reference to the sync status panel popover.
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly popover = viewChild.required<Popover>('popover');

  /**
   * Property popoverPt
   * @readonly
   *
   * @description
   * PrimeNG passthrough options removing the default popover padding.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {PopoverPassThroughOptions}
   */
  protected readonly popoverPt: PopoverPassThroughOptions = {
    content: { class: 'p-0 overflow-hidden' },
  };

  /**
   * Property chip
   * @readonly
   *
   * @description
   * Resolved presentation of the current sync state, by priority:
   * offline → blocked → syncing → pending → synced. Only the icon carries
   * the severity colour; the pill stays neutral.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ icon: string; iconClass: string; label: string; count: string; aria: string }>}
   */
  protected readonly chip: Signal<{
    icon: string;
    iconClass: string;
    label: string;
    count: string;
    aria: string;
  }> = computed(() => {
    const pending: number = this.offline.pendingCount();
    const blocked: number = this.sync.blockedOperations();
    const count: string = pending > 0 ? `· ${pending}` : '';

    if (this.connectivity.offline()) {
      return {
        icon: 'pi pi-cloud',
        iconClass: 'text-amber-600 dark:text-amber-400',
        label: $localize`:@@interventions.syncChip.offline:Offline`,
        count,
        aria:
          pending > 0
            ? $localize`:@@interventions.syncChip.offlinePendingAria:Sync status: offline, ${pending}:count: pending changes`
            : $localize`:@@interventions.syncChip.offlineAria:Sync status: offline`,
      };
    }

    if (blocked > 0) {
      return {
        icon: 'pi pi-exclamation-triangle',
        iconClass: 'text-red-600 dark:text-red-400',
        label: $localize`:@@interventions.syncChip.blocked:${blocked}:count: blocked`,
        count: '',
        aria: $localize`:@@interventions.syncChip.blockedAria:Sync status: ${blocked}:count: blocked operations`,
      };
    }

    if (this.sync.syncing()) {
      return {
        icon: 'pi pi-sync pi-spin',
        iconClass: 'text-surface-500 dark:text-surface-400',
        label: $localize`:@@interventions.syncChip.syncing:Syncing…`,
        count: '',
        aria: $localize`:@@interventions.syncChip.syncingAria:Sync status: synchronizing`,
      };
    }

    if (pending > 0) {
      return {
        icon: 'pi pi-cloud-upload',
        iconClass: 'text-amber-600 dark:text-amber-400',
        label: $localize`:@@interventions.syncChip.pending:${pending}:count: pending`,
        count: '',
        aria: $localize`:@@interventions.syncChip.pendingAria:Sync status: ${pending}:count: pending changes`,
      };
    }

    return {
      icon: 'pi pi-cloud',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      label: $localize`:@@interventions.syncChip.synced:Up to date`,
      count: '',
      aria: $localize`:@@interventions.syncChip.syncedAria:Sync status: everything is synced`,
    };
  });
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Toggles the sync status panel and refreshes the blocked-operations
   * summary, which is not live-reactive to outbox writes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - Click event used to anchor the popover.
   *
   * @returns {void}
   */
  protected toggle(event: MouseEvent): void {
    void this.sync.refreshStatus();
    this.popover().toggle(event);
  }

  /**
   * Method syncNow
   * @method syncNow
   *
   * @description
   * Manually replays the outbox. No-ops while offline or already syncing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected syncNow(): void {
    void this.sync.syncAll();
  }

  /**
   * Method retryBlocked
   * @method retryBlocked
   *
   * @description
   * Resets blocked operations to pending and replays the outbox.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryBlocked(): void {
    void this.sync.retryBlocked();
  }
  //#endregion
}
