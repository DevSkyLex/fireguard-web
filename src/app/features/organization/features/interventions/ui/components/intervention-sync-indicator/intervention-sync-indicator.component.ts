import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCloudCheck,
  lucideCloudOff,
  lucideCloudUpload,
  lucideRefreshCw,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { ConnectivityService } from '@core/connectivity';
import { INTERVENTION_OUTBOX_LABEL } from '@features/organization/features/interventions/constants';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutboxOperation,
  InterventionOutboxType,
} from '@features/organization/features/interventions/models';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import { formatInterventionRelativeTime } from '@features/organization/features/interventions/utils';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InterventionSyncDiscardDialog } from '../../dialogs/intervention-sync-discard-dialog';

/**
 * Type InterventionSyncIndicatorState
 *
 * @description
 * The five mutually exclusive states {@link InterventionSyncIndicator} can be
 * in, in the priority order its `state` computed evaluates them: a dropped
 * connection outranks a blocked replay, which outranks one in flight, which
 * outranks self-syncable work still queued.
 *
 * @since 1.0.0
 */
type InterventionSyncIndicatorState = 'offline' | 'blocked' | 'syncing' | 'pending' | 'synced';

/**
 * Component InterventionSyncIndicator
 * @class InterventionSyncIndicator
 *
 * @description
 * The shell's one address for the offline outbox: a quiet header control,
 * mounted once for every dashboard page instead of per intervention page, that
 * reads connectivity, the replay coordinator and the outbox and opens onto
 * sync now / retry blocked / discard blocked — the discard confirm-gated
 * because it is data loss. Replaces the former page-local
 * `app-intervention-sync-status`, which unmounted entirely once healthy and
 * gave an agent who had just saved offline work no confirmation once they
 * navigated away from the page that showed it.
 *
 * A shell widget contributed through {@link withSyncIndicator} to the
 * dashboard's header-actions slot, so — unlike every other component in this
 * feature — it injects its collaborators directly rather than taking them as
 * inputs (ARCHITECTURE.md: "Layouts may render feature-owned widgets through
 * public APIs").
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-sync-indicator />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-sync-indicator',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    InterventionSyncDiscardDialog,
    ...HlmPopoverImports,
    ...HlmSpinnerImports,
  ],
  providers: [
    provideIcons({
      lucideCloudCheck,
      lucideCloudOff,
      lucideCloudUpload,
      lucideRefreshCw,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './intervention-sync-indicator.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSyncIndicator {
  //#region Properties
  /**
   * Property sync
   * @readonly
   * @description The replay coordinator behind every state this control reports.
   * @access private
   * @since 1.0.0
   * @type {InterventionSyncCoordinatorService}
   */
  private readonly sync: InterventionSyncCoordinatorService = inject(
    InterventionSyncCoordinatorService,
  );

  /**
   * Property offline
   * @readonly
   * @description The outbox, read for the pending badge and the offline explanation.
   * @access private
   * @since 1.0.0
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);

  /**
   * Property connectivity
   * @readonly
   * @description The shared connectivity source of truth.
   * @access private
   * @since 1.0.0
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property locale
   * @readonly
   * @description The active locale, for the relative "last synced" label.
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property state
   * @readonly
   *
   * @description
   * The one state driving the trigger's glyph, its badge and the popover
   * body. Resolves to `'synced'` on the server: {@link ConnectivityService}
   * is optimistic-online there and the coordinator/outbox signals default to
   * their empty values before any IndexedDB access runs, so no explicit SSR
   * guard is needed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionSyncIndicatorState>}
   */
  protected readonly state: Signal<InterventionSyncIndicatorState> =
    computed<InterventionSyncIndicatorState>(() => {
      if (!this.connectivity.online()) return 'offline';
      if (this.sync.blockedOperations() > 0) return 'blocked';
      if (this.sync.syncing()) return 'syncing';
      if (this.offline.pendingCount() > 0) return 'pending';

      return 'synced';
    });

  /**
   * Property pendingCount
   * @readonly
   * @description How many self-syncable operations remain queued.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pendingCount: Signal<number> = this.offline.pendingCount;

  /**
   * Property triggerSize
   * @readonly
   *
   * @description
   * The trigger's `hlmBtn` size: a square `icon-sm`, matching the assistant
   * toggle and theme switcher either side of it in the header cluster, except
   * in `blocked`/`pending`, where a count badge needs the wider `sm` to sit
   * beside the glyph.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'icon-sm' | 'sm'>}
   */
  protected readonly triggerSize: Signal<'icon-sm' | 'sm'> = computed<'icon-sm' | 'sm'>(() =>
    this.state() === 'blocked' || this.state() === 'pending' ? 'sm' : 'icon-sm',
  );

  /**
   * Property blockedCount
   * @readonly
   * @description How many operations are blocked after a failed replay.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly blockedCount: Signal<number> = this.sync.blockedOperations;

  /**
   * Property blockedReason
   * @readonly
   * @description
   * Why the replay stopped, straight from the first blocked operation's own
   * server error. The coordinator has always computed it; until now nothing
   * rendered it, so the panel announced a count with no cause — which
   * `PRODUCT.md`'s second principle forbids: when a gate is closed, say why.
   * `null` while nothing is blocked, or when the failure carried no message.
   * @access protected
   * @since 2.0.0
   * @type {Signal<string | null>}
   */
  protected readonly blockedReason: Signal<string | null> = this.sync.problem;

  /**
   * Property triggerAriaLabel
   * @readonly
   *
   * @description
   * Names the trigger by its current state, so a screen reader announces
   * what changed without opening the popover. `blocked` and `pending` fold
   * their count into the name itself (WCAG 4.1.2): the badge is a visual
   * echo of a fact the name already states, not the only place it appears.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly triggerAriaLabel: Signal<string> = computed<string>(() => {
    switch (this.state()) {
      case 'offline':
        return $localize`:@@intervention.sync.indicator.ariaOffline:Offline, changes queued locally`;
      case 'blocked': {
        const count: number = this.blockedCount();

        return $localize`:@@intervention.sync.indicator.ariaBlocked:Synchronization blocked, ${count}:count: change(s) could not be replayed`;
      }
      case 'syncing':
        return $localize`:@@intervention.sync.indicator.ariaSyncing:Synchronizing`;
      case 'pending': {
        const count: number = this.pendingCount();

        return $localize`:@@intervention.sync.indicator.ariaPending:${count}:count: change(s) waiting to sync`;
      }
      default:
        return $localize`:@@intervention.sync.indicator.ariaSynced:Up to date`;
    }
  });

  /**
   * Property lastSyncedLabel
   * @readonly
   *
   * @description
   * "Last synced <relative time>", or a neutral "Up to date" line before the
   * first clean replay cycle. Reuses {@link formatInterventionRelativeTime},
   * the same relative-time formatter the detail page's meta line and its
   * activity thread already share — this indicator is its third consumer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly lastSyncedLabel: Signal<string> = computed<string>(() => {
    const lastSyncedAt: Date | null = this.sync.lastSyncedAt();
    if (lastSyncedAt === null) {
      return $localize`:@@intervention.sync.upToDate:Up to date`;
    }

    const relative: string = formatInterventionRelativeTime(
      lastSyncedAt.toISOString(),
      this.locale,
    );

    return $localize`:@@intervention.sync.lastSynced:Last synced ${relative}:when:`;
  });

  /**
   * Property discardConfirmVisible
   * @readonly
   * @description Whether the discard confirmation is open.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly discardConfirmVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property queue
   * @readonly
   *
   * @description
   * Every operation still waiting on this device, oldest first, loaded when the
   * panel opens rather than kept warm — an agent who never opens it never pays
   * the IndexedDB read. Empty until then, and empty on the server.
   *
   * @access protected
   * @since 7.0.0
   *
   * @type {WritableSignal<readonly InterventionOutboxOperation[]>}
   */
  protected readonly queue: WritableSignal<readonly InterventionOutboxOperation[]> = signal<
    readonly InterventionOutboxOperation[]
  >([]);

  /**
   * Property queueLoading
   * @readonly
   * @description Whether the queue read is in flight.
   * @access protected
   * @since 7.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly queueLoading: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Methods
  /**
   * Method syncNow
   * @description Asks the coordinator to replay the queue now.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected syncNow(): void {
    void this.sync.syncAll();
  }

  /**
   * Method retry
   * @description Asks the coordinator to retry the blocked operations.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retry(): void {
    void this.sync.retryBlocked();
  }

  /**
   * Method confirmDiscard
   * @description Discards the blocked operations and closes the dialog.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmDiscard(): void {
    this.discardConfirmVisible.set(false);
    void this.sync.discardBlocked();
  }

  /**
   * Method operationLabel
   * @description Names a queued operation for the panel's list.
   * @access protected
   * @since 7.0.0
   * @param {InterventionOutboxType} type - The queued operation's type.
   * @returns {string} The localized label.
   */
  protected operationLabel(type: InterventionOutboxType): string {
    return INTERVENTION_OUTBOX_LABEL[type];
  }

  /**
   * Method retryLabel
   * @description Names which queued operation a Retry button acts on, so the list does not read as "Retry, Retry, Retry".
   * @access protected
   * @since 7.0.0
   * @param {InterventionOutboxType} type - The queued operation's type.
   * @returns {string} The localized accessible label.
   */
  protected retryLabel(type: InterventionOutboxType): string {
    return $localize`:@@intervention.sync.queueRetryAria:Retry ${INTERVENTION_OUTBOX_LABEL[type]}:operation:`;
  }

  /**
   * Method discardLabel
   * @description Names which queued operation a Discard button drops permanently.
   * @access protected
   * @since 7.0.0
   * @param {InterventionOutboxType} type - The queued operation's type.
   * @returns {string} The localized accessible label.
   */
  protected discardLabel(type: InterventionOutboxType): string {
    return $localize`:@@intervention.sync.queueDiscardAria:Discard ${INTERVENTION_OUTBOX_LABEL[type]}:operation:`;
  }

  /**
   * Method onPanelState
   * @description Loads the queue when the panel opens, and drops it when it closes.
   * @access protected
   * @since 7.0.0
   * @param {'closed' | 'open'} state - The panel's new state.
   * @returns {void}
   */
  protected onPanelState(state: 'closed' | 'open'): void {
    if (state !== 'open') {
      this.queue.set([]);
      return;
    }
    void this.loadQueue();
  }

  /**
   * Method retryOperation
   * @description Retries one blocked operation, leaving the rest of the queue alone.
   * @access protected
   * @since 7.0.0
   * @param {string} id - The operation identifier.
   * @returns {void}
   */
  protected retryOperation(id: string): void {
    void this.offline.retryOutbox(id).then(() => this.loadQueue());
  }

  /**
   * Method discardOperation
   * @description Drops one queued operation permanently.
   * @access protected
   * @since 7.0.0
   * @param {string} id - The operation identifier.
   * @returns {void}
   */
  protected discardOperation(id: string): void {
    void this.offline.removeOutbox(id).then(() => this.loadQueue());
  }

  /**
   * Method loadQueue
   * @description Reads the device-global outbox into {@link queue}.
   * @access private
   * @since 7.0.0
   * @returns {Promise<void>} A promise resolving once the queue is read.
   */
  private async loadQueue(): Promise<void> {
    this.queueLoading.set(true);
    try {
      this.queue.set(await this.offline.listAllOutbox());
    } finally {
      this.queueLoading.set(false);
    }
  }
  //#endregion
}
