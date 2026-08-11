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
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type { SetupCreateOrganizationInput } from '@features/organization/setup';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import type { OnboardingOrganizationFormDraft } from './models';

/** A blank draft. */
const EMPTY_VALUES: OnboardingOrganizationFormDraft = { name: '', slug: '' };

/** Trims a free-text field, sending `undefined` rather than an empty string. */
function trimmed(value: string): string | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}

/**
 * Component OnboardingOrganizationForm
 * @class OnboardingOrganizationForm
 *
 * @description
 * The `create_organization` wizard step: the first, mandatory question the
 * activation flow asks. Composed from spartan's field primitives, matching
 * every other create form in the codebase.
 *
 * It owns its model, its rules and its own validity, and emits
 * {@link submitted} with the setup-boundary-shaped payload — the wizard page
 * creates the organization through `@features/organization/setup` and
 * confirms the step via the store (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-organization-form [pending]="isCreating()" (submitted)="createOrganization($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-organization-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports],
  templateUrl: './onboarding-organization-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingOrganizationForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the organization is being created, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation request failed with.
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
   * @description Emits the setup-boundary payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<SetupCreateOrganizationInput>}
   */
  public readonly submitted: OutputEmitterRef<SetupCreateOrganizationInput> =
    output<SetupCreateOrganizationInput>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<OnboardingOrganizationFormDraft> =
    signal<OnboardingOrganizationFormDraft>(EMPTY_VALUES);

  /**
   * Property organizationForm
   * @readonly
   * @description The field tree and its one rule.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OnboardingOrganizationFormDraft>}
   */
  protected readonly organizationForm: FieldTree<OnboardingOrganizationFormDraft> = form(
    this.model,
    (path) => {
      required(path.name, {
        message: $localize`:@@onboarding.orgForm.nameRequired:Enter your organization's name.`,
      });
    },
  );

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected request, as flat lines above the form.
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
      : [$localize`:@@onboarding.orgForm.createFailed:The organization could not be created.`];
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so the unmet rule shows, then emits when valid.
   * The optional slug is dropped rather than sent as an empty string.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.organizationForm().markAsTouched();

    if (this.organizationForm().invalid() || this.pending()) return;

    const draft: OnboardingOrganizationFormDraft = this.model();

    this.submitted.emit({ name: draft.name.trim(), slug: trimmed(draft.slug) });
  }
  //#endregion
}
