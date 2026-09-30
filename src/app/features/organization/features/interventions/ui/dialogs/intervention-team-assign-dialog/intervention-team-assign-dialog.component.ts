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
import type { MemberSelectOption, TeamOutput } from '@features/organization/models';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmRadioGroupImports } from '@shared/ui/radio-group';

/**
 * Class InterventionTeamAssignDialog
 * @class InterventionTeamAssignDialog
 *
 * @description
 * Picks an organization team to assign to the open intervention
 * (`POST /interventions/{id}/team-assignments`), mirroring
 * `InterventionAssignDialog`'s shape for the responsible picker. Explains
 * the union semantics up front: assigning a team snapshot-expands its
 * CURRENT active members into the participants list — it never replaces or
 * removes anyone, and the write is idempotent.
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
  imports: [
    ...HlmAvatarImports,
    ...HlmEmptyImports,
    ResourceIllustration,
    HlmButton,
    ...HlmDialogImports,
    ...HlmRadioGroupImports,
  ],
  templateUrl: './intervention-team-assign-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTeamAssignDialog {
  //#region Inputs
  /**
   * Property open
   * @readonly
   *
   * @description
   * Controls whether the team assignment dialog is visible.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly open: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property teams
   * @readonly
   *
   * @description
   * Supplies the teams available for assignment.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly TeamOutput[]>}
   */
  public readonly teams: InputSignal<readonly TeamOutput[]> = input<readonly TeamOutput[]>([]);

  /**
   * Property teamMemberOptions
   * @readonly
   *
   * @description
   * Resolved member previews keyed by team id; the page owns their loading and resolution.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Partial<Record<string, readonly MemberSelectOption[]>>>>}
   */
  public readonly teamMemberOptions: InputSignal<
    Readonly<Partial<Record<string, readonly MemberSelectOption[]>>>
  > = input<Readonly<Partial<Record<string, readonly MemberSelectOption[]>>>>({});

  /**
   * Property teamsLoading
   * @readonly
   *
   * @description
   * Indicates whether the available teams are still loading.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly teamsLoading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property busy
   * @readonly
   *
   * @description
   * Disables assignment actions while the selection is being saved.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * Displays the latest team assignment error when one occurs.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the selected team identifier when assignment is confirmed.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();

  /**
   * Property dismissed
   * @readonly
   *
   * @description
   * Emits when the dialog closes without submitting a team selection.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property selectedTeamId
   * @readonly
   *
   * @description
   * Holds the team selected in the dialog until submission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedTeamId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * Reflects the open input as the native dialog state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.open() ? 'open' : 'closed',
  );

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Enables submission only when a team is selected and no save is in progress.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => !this.busy() && this.selectedTeamId() !== null,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects the dialog’s reactive effects to its current input state.
   *
   * @access public
   * @since unreleased
   */
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
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The dialog's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits {@link submitted} for the picked team.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(): void {
    const teamId: string | null = this.selectedTeamId();
    if (teamId === null) return;

    this.submitted.emit(teamId);
  }
  //#endregion
}
