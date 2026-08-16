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
import type {
  InterventionAssignRequest,
  InterventionAssignSubmittedEvent,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';

/**
 * Component InterventionAssignDialog
 * @class InterventionAssignDialog
 *
 * @description
 * The member picker opened from the interventions list to reassign an
 * intervention's responsible, using the same `hlm-combobox` pattern
 * `InterventionCreateForm` uses for its own responsible field.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes
 * its open state from {@link request} being non-null. The picked member is
 * this dialog's own draft, preselected from `currentResponsible` and reset
 * whenever {@link request} changes; the caller keeps every write and decides
 * what to dispatch from {@link submitted}. `disableClose` stays bound to
 * {@link busy} while the assignment write is in flight.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-assign-dialog',
  imports: [
    HlmButton,
    ...HlmAvatarImports,
    ...HlmComboboxImports,
    ...HlmDialogImports,
    ...HlmFieldImports,
  ],
  templateUrl: './intervention-assign-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionAssignDialog {
  //#region Inputs
  /**
   * Property request
   * @readonly
   * @description What is pending assignment, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionAssignRequest | null>}
   */
  public readonly request: InputSignal<InterventionAssignRequest | null> =
    input<InterventionAssignRequest | null>(null);

  /**
   * Property members
   * @readonly
   * @description The organization's members offered as candidates.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property busy
   * @readonly
   * @description Whether the caller's write for this assignment is in flight, which disables submitting again.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The picked member, for the pending intervention.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionAssignSubmittedEvent>}
   */
  public readonly submitted: OutputEmitterRef<InterventionAssignSubmittedEvent> =
    output<InterventionAssignSubmittedEvent>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without submitting — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  constructor() {
    effect((): void => {
      const request: InterventionAssignRequest | null = this.request();

      untracked((): void => this.selectedMember.set(request?.currentResponsible ?? ''));
    });
  }
  //#endregion

  //#region Properties
  /** The member picked in this dialog, cleared or preselected whenever a new request opens. */
  protected readonly selectedMember: WritableSignal<string> = signal<string>('');

  /** The dialog state, derived from {@link request} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.request() === null ? 'closed' : 'open',
  );

  /** The dialog's body, naming the intervention being reassigned. */
  protected readonly description: Signal<string> = computed<string>(() => {
    const name: string = this.request()?.interventionName ?? '';

    return $localize`:@@intervention.assign.message:Choose who is responsible for ${name}:interventionName:.`;
  });

  /** Whether the assignment may be submitted. */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => !this.busy() && this.selectedMember() !== '',
  );

  /** Names a picked member on the closed combobox trigger. */
  protected readonly memberLabelOf: (value: string) => string = (value: string): string =>
    this.members().find((option: MemberSelectOption): boolean => option.value === value)?.label ??
    '';
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link request}, so it
   * is ignored here.
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
   *
   * @description
   * Emits {@link submitted} for the pending request with the picked member.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(): void {
    const request: InterventionAssignRequest | null = this.request();
    if (request === null || this.selectedMember() === '') return;

    this.submitted.emit({
      interventionId: request.interventionId,
      responsible: this.selectedMember(),
    });
  }
  //#endregion
}
