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
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type { CreateTeamInput } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { OrganizationTeamCreateFormDraft } from './models';

/** A blank draft. */
const EMPTY_VALUES: OrganizationTeamCreateFormDraft = { name: '', description: '' };

/** How long a team description may be — a UI safeguard, not a mirrored backend constraint. */
const DESCRIPTION_MAX_LENGTH: number = 500;

/**
 * Component OrganizationTeamCreateForm
 * @class OrganizationTeamCreateForm
 *
 * @description
 * The form that creates an organization team: a name and an optional
 * description. Composed from spartan's field primitives like the feature's
 * other create forms (`OrganizationRoleCreateForm`). Owns its model, its
 * rules and its own validity, and emits {@link submitted} with the
 * API-shaped payload — the page calls the store (`ARCHITECTURE.md` §10.4).
 * A blank description is emitted as `undefined` (omitted), matching
 * `CreateTeamInput`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-create-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmTextareaImports],
  templateUrl: './organization-team-create-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamCreateForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether a creation request is in flight, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the store's create call failed with.
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
   * @description Emits the API-shaped payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateTeamInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateTeamInput> = output<CreateTeamInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without creating anything.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<OrganizationTeamCreateFormDraft> =
    signal<OrganizationTeamCreateFormDraft>(EMPTY_VALUES);

  /**
   * Property createForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OrganizationTeamCreateFormDraft>}
   */
  protected readonly createForm: FieldTree<OrganizationTeamCreateFormDraft> = form(
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
   * @description Everything the API said about the rejected request, as flat lines shown above the form.
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
      : [$localize`:@@org.teams.form.createFailed:The team could not be created.`];
  });
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

    this.createForm().markAsTouched();

    if (this.createForm().invalid()) return;

    const draft: OrganizationTeamCreateFormDraft = this.model();

    this.submitted.emit({
      name: draft.name.trim(),
      description: draft.description.trim() === '' ? undefined : draft.description.trim(),
    });
  }
  //#endregion
}
