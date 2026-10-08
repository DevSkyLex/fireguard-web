import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { OnboardingStepFooter } from '@features/onboarding/ui/components';
import type { SetupCreateOrganizationInput } from '@features/organization/setup';
import { RequiredMarker } from '@shared/required-marker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import type { OnboardingOrganizationFormDraft } from './models';

/**
 * Constant EMPTY_VALUES
 *
 * @description
 * A blank draft.
 *
 * @type {OnboardingOrganizationFormDraft}
 *
 * @const EMPTY_VALUES
 */
const EMPTY_VALUES: OnboardingOrganizationFormDraft = { name: '', operatingProfile: 'operator' };

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
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-onboarding-organization-form [pending]="isCreating()" (submitted)="createOrganization($event)" />
 * ```
 */
@Component({
  selector: 'app-onboarding-organization-form',
  imports: [
    RequiredMarker,
    FormField,
    HlmInput,
    OnboardingStepFooter,
    ...HlmFieldImports,
    ...HlmToggleGroupImports,
  ],
  templateUrl: './onboarding-organization-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingOrganizationForm {
  /**
   * Property restored
   * @readonly
   *
   * @description
   * Pending fields restored from the server before any durable creation result exists.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<SetupCreateOrganizationInput | null>}
   */
  public readonly restored: InputSignal<SetupCreateOrganizationInput | null> =
    input<SetupCreateOrganizationInput | null>(null);

  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the organization is being created, which locks the controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property skippable
   * @readonly
   *
   * @description
   * Whether the backend currently lets this step be skipped. Always false here — the organization
   * is the one required step — but every step form shares the footer contract.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the setup-boundary payload once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<SetupCreateOrganizationInput>}
   */
  public readonly submitted: OutputEmitterRef<SetupCreateOrganizationInput> =
    output<SetupCreateOrganizationInput>();

  /**
   * Property skipped
   * @readonly
   *
   * @description
   * Relays the footer's skip request to the page.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * The footer's resting label — the step's verb, not a generic "Continue".
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   *
   * @property submitLabel
   */
  protected readonly submitLabel: string = $localize`:@@onboarding.orgForm.submit:Create organization`;

  /**
   * Property pendingLabel
   * @readonly
   *
   * @description
   * The footer's label while the organization is being created.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   *
   * @property pendingLabel
   */
  protected readonly pendingLabel: string = $localize`:@@onboarding.orgForm.submitting:Creating…`;

  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited draft.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<OnboardingOrganizationFormDraft>}
   *
   * @property model
   */
  protected readonly model: WritableSignal<OnboardingOrganizationFormDraft> = linkedSignal(() => ({
    name: this.restored()?.name ?? EMPTY_VALUES.name,
    operatingProfile: this.restored()?.operatingProfile ?? EMPTY_VALUES.operatingProfile,
  }));

  /**
   * Property organizationForm
   * @readonly
   *
   * @description
   * The field tree and its one rule.
   *
   * @access protected
   * @since 1.0.0
   *
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

  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so the unmet rule shows, then emits when valid.
   * The server derives the workspace slug from its name.
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

    this.submitted.emit({ name: draft.name.trim(), operatingProfile: draft.operatingProfile });
  }

  /**
   * Method changeOperatingProfile
   *
   * @description
   * Writes the selected profile into the same durable Signal Forms draft.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string | readonly string[] | null | undefined} value - Native toggle-group selection.
   *
   * @returns {void}
   */
  protected changeOperatingProfile(value: string | readonly string[] | null | undefined): void {
    if (value === 'operator' || value === 'service_provider') {
      this.organizationForm.operatingProfile().value.set(value);
      this.organizationForm.operatingProfile().markAsTouched();
    }
  }
  //#endregion
}
