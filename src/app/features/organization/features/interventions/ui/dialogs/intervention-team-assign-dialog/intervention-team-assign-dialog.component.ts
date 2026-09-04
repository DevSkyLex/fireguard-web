import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { TeamOutput } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmRadioGroupImports } from '@shared/ui/radio-group';

/**
 * Component InterventionTeamAssignDialog
 * @class InterventionTeamAssignDialog
 *
 * @description
 * Picks an organization team to assign to the open intervention
 * (`POST /interventions/{id}/team-assignments`), mirroring
 * `InterventionAssignDialog`'s shape for the responsible picker. Explains
 * the union semantics up front: assigning a team snapshot-expands its
 * CURRENT active members into the participants list — it never replaces or
 * removes anyone, and the write is idempotent.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and
 * takes its open state from {@link open}. The picked team is this dialog's
 * own draft, cleared whenever {@link open} transitions to `false`; the
 * caller keeps every write and decides what to dispatch from
 * {@link submitted}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-team-assign-dialog',
  imports: [...HlmEmptyImports, HlmButton, ...HlmDialogImports, ...HlmRadioGroupImports],
  templateUrl: './intervention-team-assign-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTeamAssignDialog {
  //#region Inputs
  /** Whether the dialog is open. Owned by the caller. */
  public readonly open: InputSignal<boolean> = input<boolean>(false);

  /** The organization's teams, offered as candidates. */
  public readonly teams: InputSignal<readonly TeamOutput[]> = input<readonly TeamOutput[]>([]);

  /** Whether the team list is still loading. */
  public readonly teamsLoading: InputSignal<boolean> = input<boolean>(false);

  /** Whether the caller's assignment write is in flight. */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);

  /** The caller's last failure message, if any — a 422 (no active members) or a 409 (no longer assignable). */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /** The picked team's id. */
  public readonly submitted: OutputEmitterRef<string> = output<string>();

  /** The dialog was closed without submitting — Escape, the backdrop, or Cancel. */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The team picked in this dialog, cleared whenever a new open cycle starts. */
  protected readonly selectedTeamId: WritableSignal<string | null> = signal<string | null>(null);

  /** The dialog state, derived from {@link open}. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.open() ? 'open' : 'closed',
  );

  /** Whether the assignment may be submitted. */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => !this.busy() && this.selectedTeamId() !== null,
  );
  //#endregion

  //#region Constructor
  public constructor() {
    effect((): void => {
      const isOpen: boolean = this.open();

      untracked((): void => {
        if (!isOpen) this.selectedTeamId.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description Relays a dismissal — Escape or the backdrop.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The dialog's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method submit
   *
   * @description Emits {@link submitted} for the picked team.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submit(): void {
    const teamId: string | null = this.selectedTeamId();
    if (teamId === null) return;

    this.submitted.emit(teamId);
  }
  //#endregion
}
