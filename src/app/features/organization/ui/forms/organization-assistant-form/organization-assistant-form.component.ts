import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, max, min, type FieldTree } from '@angular/forms/signals';
import type { OrganizationAssistantSettings } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSwitch } from '@shared/ui/switch';
import type { OrganizationAssistantFormValues } from './models';

/**
 * Constant MIN_TEMPERATURE
 * @const MIN_TEMPERATURE
 *
 * @description Lower bound the backend accepts for the sampling temperature.
 * @since 1.0.0
 * @type {number}
 */
const MIN_TEMPERATURE: number = 0;

/**
 * Constant MAX_TEMPERATURE
 * @const MAX_TEMPERATURE
 *
 * @description Upper bound the backend accepts for the sampling temperature.
 * @since 1.0.0
 * @type {number}
 */
const MAX_TEMPERATURE: number = 2;

/**
 * Component OrganizationAssistantForm
 * @class OrganizationAssistantForm
 *
 * @description
 * The organization's AI-assistant policy: whether it is available, the
 * sampling temperature, and whether the server pre-injects a bounded
 * business-context block alongside the thread transcript. The model
 * override renders as read-only text — there is no operator-published
 * model catalog to pick from yet, so this never offers a picker
 * (`FEATURE.md`). It owns its model and rules and emits {@link submitted};
 * the page maps the values onto the settings PATCH and calls the store
 * (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-assistant-form [assistant]="settings().assistant" [pending]="store.isSaving()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-assistant-form',
  imports: [FormField, HlmButton, HlmInput, HlmSwitch, ...HlmFieldImports],
  templateUrl: './organization-assistant-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAssistantForm {
  //#region Inputs
  /**
   * Property assistant
   * @readonly
   *
   * @description
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationAssistantSettings>}
   */
  public readonly assistant: InputSignal<OrganizationAssistantSettings> =
    input.required<OrganizationAssistantSettings>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is in flight, which disables the submit control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the edited values once the form is valid and has changed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationAssistantFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationAssistantFormValues> =
    output<OrganizationAssistantFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property modelLabel
   * @readonly
   *
   * @description
   * The model override rendered as read-only text, or a stated default when
   * the organization has none.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly modelLabel: Signal<string> = computed<string>(
    () =>
      this.assistant().model ??
      $localize`:@@org.settings.assistant.modelDefault:Using the operator default`,
  );

  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values, re-seeded from {@link assistant} whenever it
   * changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationAssistantFormValues>}
   */
  protected readonly model: WritableSignal<OrganizationAssistantFormValues> = linkedSignal(
    (): OrganizationAssistantFormValues => {
      const assistant: OrganizationAssistantSettings = this.assistant();
      return {
        enabled: assistant.enabled,
        temperature: assistant.temperature,
        includeBusinessContext: assistant.includeBusinessContext,
      };
    },
  );

  /**
   * Property assistantForm
   * @readonly
   *
   * @description
   * The field tree and its rules. `temperature` is bounded to what the
   * backend accepts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationAssistantFormValues>}
   */
  protected readonly assistantForm: FieldTree<OrganizationAssistantFormValues> = form(
    this.model,
    (path): void => {
      min(path.temperature, MIN_TEMPERATURE, {
        message: $localize`:@@org.settings.assistant.temperatureTooLow:Enter at least ${MIN_TEMPERATURE}:min:`,
      });
      max(path.temperature, MAX_TEMPERATURE, {
        message: $localize`:@@org.settings.assistant.temperatureTooHigh:Enter at most ${MAX_TEMPERATURE}:max:`,
      });
    },
  );

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Whether the submit control should be enabled: the tree is valid, has
   * changed from the seeded values, and no save is already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.assistantForm().valid() && this.assistantForm().dirty() && !this.pending(),
  );
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the form touched so every failing rule becomes visible, then emits
   * only if it is valid and changed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.assistantForm().markAsTouched();

    if (!this.canSubmit()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
