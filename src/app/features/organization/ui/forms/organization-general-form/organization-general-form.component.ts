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
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmTextarea } from '@shared/ui/textarea';
import type { OrganizationGeneralFormValues } from './models';

/**
 * Component OrganizationGeneralForm
 * @class OrganizationGeneralForm
 *
 * @description
 * The organization's identity fields: name, slug and description. It owns its
 * model and rules and emits {@link submitted}; the page maps the values onto
 * the settings PATCH and calls the store (`ARCHITECTURE.md` §10.4).
 *
 * The model is a `linkedSignal` over {@link organization}, so a freshly saved
 * — or freshly loaded — organization re-seeds the fields instead of leaving
 * the user looking at a stale draft. The submit control stays disabled until
 * the tree is both valid and dirty, so a save cannot fire on an unchanged
 * form.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-general-form [organization]="values()" [pending]="store.isSaving()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-general-form',
  imports: [FormField, HlmButton, HlmInput, HlmTextarea, ...HlmFieldImports],
  templateUrl: './organization-general-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationGeneralForm {
  //#region Inputs
  /**
   * Property organization
   * @readonly
   *
   * @description
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationGeneralFormValues>}
   */
  public readonly organization: InputSignal<OrganizationGeneralFormValues> =
    input.required<OrganizationGeneralFormValues>();

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
   * @type {OutputEmitterRef<OrganizationGeneralFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationGeneralFormValues> =
    output<OrganizationGeneralFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values, re-seeded from {@link organization} whenever it
   * changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationGeneralFormValues>}
   */
  protected readonly model: WritableSignal<OrganizationGeneralFormValues> = linkedSignal(
    (): OrganizationGeneralFormValues => ({ ...this.organization() }),
  );

  /**
   * Property generalForm
   * @readonly
   *
   * @description
   * The field tree and its rules. Name and slug are required: both are
   * non-optional on the resource the form seeds from, and the update endpoint
   * has no way to blank either back out.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationGeneralFormValues>}
   */
  protected readonly generalForm: FieldTree<OrganizationGeneralFormValues> = form(
    this.model,
    (path): void => {
      required(path.name, {
        message: $localize`:@@org.settings.general.nameRequired:Enter an organization name`,
      });
      required(path.slug, {
        message: $localize`:@@org.settings.general.slugRequired:Enter a URL slug`,
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
    () => this.generalForm().valid() && this.generalForm().dirty() && !this.pending(),
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

    this.generalForm().markAsTouched();

    if (!this.canSubmit()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
