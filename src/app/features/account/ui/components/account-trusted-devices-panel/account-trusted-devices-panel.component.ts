import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShieldOff, lucideTrash2, lucideTriangleAlert } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AccountTrustedDevicesPanel
 * @class AccountTrustedDevicesPanel
 *
 * @description
 * The devices remembered well enough to skip a second factor, individually
 * or collectively revocable.
 *
 * Presentational only: it renders from {@link devices} and emits
 * {@link deviceRevoked} / {@link allRevoked} / {@link retried}, never
 * calling a store itself (`ARCHITECTURE.md` §10.3). "Revoke all devices"
 * sits behind a local alert-dialog confirmation that stays open and
 * busy-locked until {@link revokingAll} settles, then closes on its own.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-trusted-devices-panel
 *   [devices]="trustedDeviceStore.devices()"
 *   [loading]="trustedDeviceStore.listCallState().status === 'pending'"
 *   [loadError]="trustedDeviceStore.listCallState().status === 'error'"
 *   [revoking]="trustedDeviceStore.isRevoking()"
 *   [revokingAll]="trustedDeviceStore.isRevokingAll()"
 *   (deviceRevoked)="trustedDeviceStore.revokeDevice($event)"
 *   (allRevoked)="trustedDeviceStore.revokeAllDevices()"
 *   (retried)="trustedDeviceStore.load()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-trusted-devices-panel',
  imports: [NgIcon, ...HlmEmptyImports, DatePipe, HlmButton, HlmSkeleton, ...HlmAlertDialogImports],
  providers: [provideIcons({ lucideShieldOff, lucideTrash2, lucideTriangleAlert })],
  templateUrl: './account-trusted-devices-panel.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTrustedDevicesPanel {
  //#region Inputs
  /**
   * Property devices
   * @readonly
   *
   * @description
   * The trusted devices to list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<TrustedDeviceOutput>>}
   */
  public readonly devices: InputSignal<ReadonlyArray<TrustedDeviceOutput>> = input<
    ReadonlyArray<TrustedDeviceOutput>
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the list is being fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loadError
   * @readonly
   *
   * @description
   * Whether the list failed to load.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loadError: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property revoking
   * @readonly
   *
   * @description
   * Whether a single-device revoke is in flight, busy-locking every Revoke
   * control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly revoking: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property revokingAll
   * @readonly
   *
   * @description
   * Whether "Revoke all devices" is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly revokingAll: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property deviceRevoked
   * @readonly
   *
   * @description
   * Emits the ID of the device to revoke.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly deviceRevoked: OutputEmitterRef<string> = output<string>();

  /**
   * Property allRevoked
   * @readonly
   *
   * @description
   * Emits once the "Revoke all devices" confirmation is accepted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly allRevoked: OutputEmitterRef<void> = output<void>();

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Emits when the reader asks to load the list again after a failure.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property confirmAllOpen
   * @readonly
   *
   * @description
   * Whether the "Revoke all devices" confirmation is open. Purely local
   * interaction state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmAllOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property confirmAllState
   * @readonly
   *
   * @description
   * The confirmation overlay's own open/closed state, derived from
   * {@link confirmAllOpen}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly confirmAllState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.confirmAllOpen() ? 'open' : 'closed',
  );
  //#endregion

  //#region Lifecycle
  /**
   * Property closeConfirmOnceSettled
   * @readonly
   *
   * @description
   * Closes the confirmation once the revoke-all write settles, success or
   * failure alike — the outcome is reported as a toast, not by this dialog.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly closeConfirmOnceSettled: EffectRef = effect((): void => {
    if (this.revokingAll()) return;

    untracked((): void => this.confirmAllOpen.set(false));
  });
  //#endregion

  //#region Methods
  /**
   * Method revokeDeviceOne
   * @method revokeDeviceOne
   *
   * @description
   * Asks to revoke one device, refused while another revoke is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} deviceId - The device to revoke.
   *
   * @returns {void}
   */
  protected revokeDeviceOne(deviceId: string): void {
    if (this.revoking()) return;

    this.deviceRevoked.emit(deviceId);
  }

  /**
   * Method openConfirmAll
   * @method openConfirmAll
   *
   * @description
   * Opens the "Revoke all devices" confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openConfirmAll(): void {
    this.confirmAllOpen.set(true);
  }

  /**
   * Method onConfirmAllStateChanged
   * @method onConfirmAllStateChanged
   *
   * @description
   * Tracks a dismissal — Cancel, the backdrop or Escape — ignored while the
   * write is in flight, matching the bound `disableClose`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onConfirmAllStateChanged(state: BrnDialogState): void {
    if (this.revokingAll()) return;

    this.confirmAllOpen.set(state === 'open');
  }

  /**
   * Method confirmAll
   * @method confirmAll
   *
   * @description
   * Emits the confirmed "revoke all devices", refused while a previous one is
   * already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmAll(): void {
    if (this.revokingAll()) return;

    this.allRevoked.emit();
  }
  //#endregion
}
