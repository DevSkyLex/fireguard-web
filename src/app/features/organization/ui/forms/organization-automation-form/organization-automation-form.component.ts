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
import { disabled, form, FormField, type FieldTree } from '@angular/forms/signals';
import type { OrganizationAutomationSettings } from '@features/organization/models';
import { HlmField, HlmFieldDescription, HlmFieldLabel } from '@shared/ui/field';
import { HlmSwitch } from '@shared/ui/switch';

/**
 * Component OrganizationAutomationForm
 * @class OrganizationAutomationForm
 *
 * @description
 * The organization's automation toggles: currently the single switch that
 * auto-creates a draft corrective intervention when a critical
 * non-conformity is recorded. Commits on every change, matching
 * `OrganizationNotificationsForm` — a preference switch, not a record edit
 * with a separate save step. It owns its model and emits {@link submitted};
 * the page maps the values onto the settings PATCH and calls the store
 * (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-automation-form [automation]="settings().automation" [pending]="store.isSaving()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-automation-form',
  imports: [FormField, HlmField, HlmFieldDescription, HlmFieldLabel, HlmSwitch],
  templateUrl: './organization-automation-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAutomationForm {
  //#region Inputs
  /**
   * Property automation
   * @readonly
   *
   * @description
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationAutomationSettings>}
   */
  public readonly automation: InputSignal<OrganizationAutomationSettings> =
    input.required<OrganizationAutomationSettings>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is in flight, which locks the switch so a second toggle
   * cannot race the first.
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
   * Emits the full automation policy after the switch changes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationAutomationSettings>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationAutomationSettings> =
    output<OrganizationAutomationSettings>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values, re-seeded from {@link automation} whenever it
   * changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationAutomationSettings>}
   */
  protected readonly model: WritableSignal<OrganizationAutomationSettings> = linkedSignal(
    (): OrganizationAutomationSettings => ({ ...this.automation() }),
  );

  /**
   * Property automationForm
   * @readonly
   *
   * @description
   * The field tree. The single switch disables while {@link pending} is
   * true, so a second toggle cannot race the first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationAutomationSettings>}
   */
  protected readonly automationForm: FieldTree<OrganizationAutomationSettings> = form(
    this.model,
    (path): void => {
      disabled(path, () => this.pending());
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method commit
   * @method commit
   *
   * @description
   * Emits the current values after the switch changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected commit(): void {
    if (this.pending()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
