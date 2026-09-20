import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideSearch } from '@ng-icons/lucide';
import { BrnCommandInput } from '@spartan-ng/brain/command';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { AddTeamMemberInput, MemberSelectOption } from '@features/organization/models';
import { serverMessagesOf } from '@shared/form-feedback';

import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmCommandImports } from '@shared/ui/command';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmInputGroupImports } from '@shared/ui/input-group';

import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmItemImports } from '@shared/ui/item';
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
 * already excluding the current roster. Mobile uses an inline command list inside
 * the owning sheet, preserving the same selected member and membership-label draft.
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
  imports: [
    NgIcon,
    BrnCommandInput,
    HlmInputGroupImports,
    ...HlmCommandImports,
    ...HlmAvatarImports,
    ...HlmItemImports,
    HlmButton,
    HlmInput,
    ...HlmComboboxImports,
    ...HlmFieldImports,
  ],
  providers: [provideIcons({ lucideCheck, lucideSearch })],
  templateUrl: './organization-team-member-add-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamMemberAddForm {
  /**
   * Property selectedMemberOption
   * @readonly
   *
   * @description
   * Organization identity of the selected member; the submitted identifier remains unchanged.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly selectedMemberOption: Signal<MemberSelectOption | null> = computed(
    () => this.candidates().find((member) => member.value === this.selectedMemberId()) ?? null,
  );

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Selects the inline touch picker without replacing this form or its draft.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

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
  /**
   * Property selectedMemberId
   * @readonly
   * @description The member picked in this form, or `NO_PICK_VALUE` for none yet.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly selectedMemberId: WritableSignal<string> = signal<string>(NO_PICK_VALUE);

  /**
   * Property roleLabel
   * @readonly
   * @description The free-text membership label.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly roleLabel: WritableSignal<string> = signal<string>('');

  /**
   * Property hasCandidates
   * @readonly
   * @description Whether the picker holds any candidate to offer.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly hasCandidates: Signal<boolean> = computed<boolean>(
    () => this.candidates().length > 0,
  );

  /**
   * Property canSubmit
   * @readonly
   * @description Whether the add action may submit.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.selectedMemberId() !== NO_PICK_VALUE && !this.pending(),
  );

  /**
   * Property memberLabelOf
   * @readonly
   * @description Names a picked member on the closed combobox trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
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
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@org.teams.membersSheet.addFailed:The member could not be added.`,
    ),
  );
  //#endregion

  //#region Methods
  /**
   * Method onMemberPicked
   * @method onMemberPicked
   * @description Narrows picker output to an available member or an empty selection, ignoring changes while a submission is pending.
   * @access protected
   * @since 1.0.0
   * @param {unknown} value - The picker output.
   * @returns {void}
   */
  protected onMemberPicked(value: unknown): void {
    if (this.pending()) return;
    if (value === null || value === undefined || value === NO_PICK_VALUE) {
      this.selectedMemberId.set(NO_PICK_VALUE);
      return;
    }
    if (typeof value !== 'string') return;
    if (
      !this.candidates().some((candidate: MemberSelectOption): boolean => candidate.value === value)
    )
      return;
    this.selectedMemberId.set(value);
  }

  /**
   * Method submit
   * @method submit
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
