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
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type { AddTeamMemberInput, MemberSelectOption } from '@features/organization/models';
import { PersonOption } from '@shared/person-option';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';

/** The value standing in for "no member picked" in the combobox — a member id is never an empty string. */
const NO_PICK_VALUE: string = '';

/**
 * Component OrganizationTeamMemberAddForm
 * @class OrganizationTeamMemberAddForm
 *
 * @description
 * Picks an organization member and an optional free-text membership label
 * (e.g. `"lead"` — not an RBAC role, `TeamMemberOutput.role`), mirroring
 * `EquipmentAssignFacilityDialog`'s `hlm-combobox` picker pattern. The
 * caller ({@link OrganizationTeamMembersSheet}) supplies {@link candidates}
 * already excluding the current roster.
 *
 * Presentational (`ARCHITECTURE.md` §10.3): it owns only its own draft and
 * emits {@link submitted}; the sheet's own page calls `addMember` and owns
 * the resulting request state. The draft clears itself immediately on
 * submit rather than waiting for the write to settle — a failed add still
 * surfaces through {@link serverError} above the picker, and the member
 * stays offered again in the (unchanged) candidate list.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-member-add-form',
  imports: [HlmButton, HlmInput, PersonOption, ...HlmComboboxImports, ...HlmFieldImports],
  templateUrl: './organization-team-member-add-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamMemberAddForm {
  //#region Inputs
  /**
   * Property candidates
   * @readonly
   * @description Organization members not already on the roster, offered as picks.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly candidates: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property pending
   * @readonly
   * @description Whether an add request is in flight, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last add attempt failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The picked member and optional membership label.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<AddTeamMemberInput>}
   */
  public readonly submitted: OutputEmitterRef<AddTeamMemberInput> = output<AddTeamMemberInput>();
  //#endregion

  //#region Properties
  /** The member picked in this form, or `NO_PICK_VALUE` for none yet. */
  protected readonly selectedMemberId: WritableSignal<string> = signal<string>(NO_PICK_VALUE);

  /** The free-text membership label. */
  protected readonly roleLabel: WritableSignal<string> = signal<string>('');

  /** Whether the picker holds any candidate to offer. */
  protected readonly hasCandidates: Signal<boolean> = computed<boolean>(
    () => this.candidates().length > 0,
  );

  /** Whether the add action may submit. */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.selectedMemberId() !== NO_PICK_VALUE && !this.pending(),
  );

  /** Names a picked member on the closed combobox trigger. */
  protected readonly memberLabelOf: (value: string) => string = (value: string): string =>
    this.candidates().find((candidate) => candidate.value === value)?.displayName ?? '';

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected add, as flat lines above the picker.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [$localize`:@@org.teams.membersSheet.addFailed:The member could not be added.`];
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @description Emits the picked member and clears the draft.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submit(): void {
    if (!this.canSubmit()) return;

    const memberId: string = this.selectedMemberId();
    const role: string = this.roleLabel().trim();

    this.submitted.emit(role === '' ? { memberId } : { memberId, role });

    this.selectedMemberId.set(NO_PICK_VALUE);
    this.roleLabel.set('');
  }
  //#endregion
}
