import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCloudUpload, lucideRefreshCw, lucideTriangleAlert } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/**
 * Component InterventionSyncStatus
 * @class InterventionSyncStatus
 *
 * @description
 * The one address for the offline outbox's state: a quiet chip that spins
 * while a replay runs, shows a cloud when operations wait for the network,
 * and turns destructive with a count when operations are blocked. Opening it
 * reveals the actions — sync now, retry the blocked operations, or discard
 * them, the latter confirm-gated because a discard is data loss.
 *
 * Presentational: the page injects `InterventionSyncCoordinatorService` and
 * wires its signals in, so this surface never owns the sync workflow
 * (ARCHITECTURE.md §2.5).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-sync-status
 *   [syncing]="sync.syncing()"
 *   [blockedCount]="sync.blockedOperations()"
 *   [unsynced]="hasUnsyncedChanges()"
 *   (syncRequested)="sync.syncAll()"
 *   (retryRequested)="sync.retryBlocked()"
 *   (discardRequested)="sync.discardBlocked()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-sync-status',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    ...HlmAlertDialogImports,
    ...HlmPopoverImports,
    ...HlmSpinnerImports,
  ],
  providers: [provideIcons({ lucideCloudUpload, lucideRefreshCw, lucideTriangleAlert })],
  templateUrl: './intervention-sync-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSyncStatus {
  //#region Inputs
  /**
   * Property syncing
   * @readonly
   * @description Whether a replay is in flight right now.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly syncing: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property blockedCount
   * @readonly
   * @description How many queued operations are blocked after failed replays.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly blockedCount: InputSignal<number> = input<number>(0);

  /**
   * Property unsynced
   * @readonly
   * @description Whether un-replayed operations wait for the network.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly unsynced: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property syncRequested
   * @readonly
   * @description The operator asked to replay the queue now.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly syncRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property retryRequested
   * @readonly
   * @description The operator asked to retry the blocked operations.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property discardRequested
   * @readonly
   * @description The operator confirmed discarding the blocked operations.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly discardRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Whether the discard confirmation is open. */
  protected readonly discardConfirmVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the chip has anything to say at all. */
  protected readonly visible: Signal<boolean> = computed<boolean>(
    () => this.syncing() || this.unsynced() || this.blockedCount() > 0,
  );
  //#endregion

  //#region Methods
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
   * @description Emits the confirmed discard and closes the dialog.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmDiscard(): void {
    this.discardConfirmVisible.set(false);
    this.discardRequested.emit();
  }
  //#endregion
}
