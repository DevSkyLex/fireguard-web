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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import { formatInterventionRelativeTime } from '@features/organization/features/interventions/utils';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSpinnerImports } from '@shared/ui/spinner';

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
    ...HlmAlertDialogImports,
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
   * Method onDiscardDialogStateChanged
   * @description Mirrors an overlay-initiated close back into the local flag.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onDiscardDialogStateChanged(state: BrnDialogState): void {
    if (state === 'closed') this.discardConfirmVisible.set(false);
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
  //#endregion
}
