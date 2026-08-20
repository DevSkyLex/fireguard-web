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
import {
  lucideLogOut,
  lucideMonitor,
  lucideShieldCheck,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { SessionOutput } from '@features/auth/models';
import { ErrorState } from '@shared/error-state';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AccountSessionsPanel
 * @class AccountSessionsPanel
 *
 * @description
 * The list of browsers and devices currently signed into the account, with
 * the current one flagged and the others individually or collectively
 * revocable.
 *
 * Presentational only: it renders from {@link sessions} and emits
 * {@link sessionRevoked} / {@link othersRevoked} / {@link retried}, never
 * calling a store itself (`ARCHITECTURE.md` §10.3). "Sign out other
 * sessions" sits behind a local alert-dialog confirmation that stays open and
 * busy-locked until {@link revokingOthers} settles, then closes on its own —
 * the outcome, success or failure, is reported elsewhere (a toast), so the
 * dialog does not need to know which one it was.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-sessions-panel
 *   [sessions]="sessionStore.sessions()"
 *   [currentSessionId]="sessionStore.currentSession()?.id ?? null"
 *   [loading]="sessionStore.listCallState().status === 'pending'"
 *   [loadError]="sessionStore.listCallState().status === 'error'"
 *   [revoking]="sessionStore.isRevoking()"
 *   [revokingOthers]="sessionStore.isRevokingAll()"
 *   [hasOtherSessions]="sessionStore.hasOtherSessions()"
 *   (sessionRevoked)="sessionStore.revoke($event)"
 *   (othersRevoked)="sessionStore.revokeOthers()"
 *   (retried)="sessionStore.load()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-sessions-panel',
  imports: [
    DatePipe,
    NgIcon,
    ErrorState,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertDialogImports,
  ],
  providers: [
    provideIcons({ lucideLogOut, lucideMonitor, lucideShieldCheck, lucideTriangleAlert }),
  ],
  templateUrl: './account-sessions-panel.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSessionsPanel {
  //#region Inputs
  /**
   * Property sessions
   * @readonly
   *
   * @description
   * The active sessions to list, current one included.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<SessionOutput>>}
   */
  public readonly sessions: InputSignal<ReadonlyArray<SessionOutput>> = input<
    ReadonlyArray<SessionOutput>
  >([]);

  /**
   * Property currentSessionId
   * @readonly
   *
   * @description
   * The session ID making this very request, or `null` while it is unknown.
   * Drives the "Current" badge and hides the Revoke control on that row.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentSessionId: InputSignal<string | null> = input<string | null>(null);

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
   * Whether the list failed to load. Unlike a revoke failure, this is worth a
   * local surface: without it, nothing on the page can be shown at all.
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
   * Whether a single-session revoke is in flight, busy-locking every Revoke
   * control since the store only allows one such write at a time.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly revoking: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property revokingOthers
   * @readonly
   *
   * @description
   * Whether "Sign out other sessions" is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly revokingOthers: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasOtherSessions
   * @readonly
   *
   * @description
   * Whether any session besides the current one exists. Drives the "Sign out
   * other sessions" control's visibility.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasOtherSessions: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property sessionRevoked
   * @readonly
   *
   * @description
   * Emits the ID of the session to revoke.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly sessionRevoked: OutputEmitterRef<string> = output<string>();

  /**
   * Property othersRevoked
   * @readonly
   *
   * @description
   * Emits once the "Sign out other sessions" confirmation is accepted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly othersRevoked: OutputEmitterRef<void> = output<void>();

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
   * Property confirmOthersOpen
   * @readonly
   *
   * @description
   * Whether the "Sign out other sessions" confirmation is open. Purely local
   * interaction state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmOthersOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property confirmOthersState
   * @readonly
   *
   * @description
   * The confirmation overlay's own open/closed state, derived from
   * {@link confirmOthersOpen}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly confirmOthersState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.confirmOthersOpen() ? 'open' : 'closed',
  );

  /**
   * Property unknownDeviceLabel
   * @readonly
   *
   * @description
   * What a row shows when neither the browser nor the device type could be
   * detected from the user agent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly unknownDeviceLabel: string = $localize`:@@account.sessions.unknownDevice:Unknown device`;
  //#endregion

  //#region Lifecycle
  /**
   * Property closeConfirmOnceSettled
   * @readonly
   *
   * @description
   * Closes the confirmation once the revoke-others write settles, success or
   * failure alike — the outcome is reported as a toast, not by this dialog.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly closeConfirmOnceSettled: EffectRef = effect((): void => {
    if (this.revokingOthers()) return;

    untracked((): void => this.confirmOthersOpen.set(false));
  });
  //#endregion

  //#region Methods
  /**
   * Method revokeSession
   * @method revokeSession
   *
   * @description
   * Asks to revoke one session, refused while another revoke is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} sessionId - The session to revoke.
   *
   * @returns {void}
   */
  protected revokeSession(sessionId: string): void {
    if (this.revoking()) return;

    this.sessionRevoked.emit(sessionId);
  }

  /**
   * Method openConfirmOthers
   * @method openConfirmOthers
   *
   * @description
   * Opens the "Sign out other sessions" confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openConfirmOthers(): void {
    this.confirmOthersOpen.set(true);
  }

  /**
   * Method onConfirmOthersStateChanged
   * @method onConfirmOthersStateChanged
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
  protected onConfirmOthersStateChanged(state: BrnDialogState): void {
    if (this.revokingOthers()) return;

    this.confirmOthersOpen.set(state === 'open');
  }

  /**
   * Method confirmOthers
   * @method confirmOthers
   *
   * @description
   * Emits the confirmed "sign out other sessions", refused while a previous
   * one is already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmOthers(): void {
    if (this.revokingOthers()) return;

    this.othersRevoked.emit();
  }
  //#endregion
}
