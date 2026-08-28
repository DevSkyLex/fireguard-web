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
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type { TeamOutput, UpdateTeamInput } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { OrganizationTeamEditFormDraft } from './models';

/** A blank draft, for a not-yet-seeded render. */
const EMPTY_VALUES: OrganizationTeamEditFormDraft = { name: '', description: '' };

/** How long a team description may be — a UI safeguard, not a mirrored backend constraint. */
const DESCRIPTION_MAX_LENGTH: number = 500;

/**
 * Component OrganizationTeamEditForm
 * @class OrganizationTeamEditForm
 *
 * @description
 * The form that renames a team or changes its description, prefilled from
 * {@link team} — the same two fields as `OrganizationTeamCreateForm`, kept
 * as a separate small component rather than a mode-switched one (`CLAUDE.md`
 * rule 8: two near-duplicate two-field forms are cheaper than a config-driven
 * abstraction serving both).
 *
 * The draft is seeded from {@link team} through a constructor `effect`
 * rather than a field initializer, mirroring `EquipmentAssignFacilityDialog`
 * — the safe, established pattern in this codebase for reading an input at
 * construction time. A blank description is emitted as `null` (explicit
 * clear), not `undefined` (which `UpdateTeamInput`'s merge-patch semantics
 * read as "leave unchanged").
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-edit-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmTextareaImports],
  templateUrl: './organization-team-edit-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamEditForm {
  //#region Inputs
  /**
   * Property team
   * @readonly
   * @description The team being edited. `null` renders a blank, disabled shell — the caller only mounts this form once a team is selected.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<TeamOutput | null>}
   */
  public readonly team: InputSignal<TeamOutput | null> = input<TeamOutput | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether an update request is in flight, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the store's update call failed with.
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
   * @description Emits the API-shaped partial payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateTeamInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateTeamInput> = output<UpdateTeamInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without saving anything.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The edited draft, seeded from {@link team}. */
  protected readonly model: WritableSignal<OrganizationTeamEditFormDraft> =
    signal<OrganizationTeamEditFormDraft>(EMPTY_VALUES);

  /**
   * Property editForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OrganizationTeamEditFormDraft>}
   */
  protected readonly editForm: FieldTree<OrganizationTeamEditFormDraft> = form(
    this.model,
    (path) => {
      required(path.name, {
        message: $localize`:@@org.teams.form.nameRequired:Team name is required.`,
      });
      maxLength(path.description, DESCRIPTION_MAX_LENGTH, {
        message: $localize`:@@org.teams.form.descriptionTooLong:This description is too long.`,
      });
    },
  );

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected update, as flat lines shown above the form.
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
      : [$localize`:@@org.teams.editForm.updateFailed:The team could not be updated.`];
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @description Seeds {@link model} from {@link team} whenever it changes.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const team: TeamOutput | null = this.team();

      untracked((): void => {
        this.model.set(team ? { name: team.name, description: team.description } : EMPTY_VALUES);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @description Marks the tree touched so every unmet rule shows at once, then emits when the form is valid.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The submit event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.editForm().markAsTouched();

    if (this.editForm().invalid()) return;

    const draft: OrganizationTeamEditFormDraft = this.model();
    const trimmedDescription: string = draft.description.trim();

    this.submitted.emit({
      name: draft.name.trim(),
      description: trimmedDescription === '' ? null : trimmedDescription,
    });
  }
  //#endregion
}
