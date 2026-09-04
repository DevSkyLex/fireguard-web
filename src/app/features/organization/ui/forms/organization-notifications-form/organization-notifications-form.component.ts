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
import type { OrganizationNotificationSettings } from '@features/organization/models';
import { HlmField, HlmFieldDescription, HlmFieldGroup, HlmFieldLabel } from '@shared/ui/field';
import { HlmSwitch } from '@shared/ui/switch';

/**
 * Component OrganizationNotificationsForm
 * @class OrganizationNotificationsForm
 *
 * @description
 * The organization's notification policy: which delivery channels are on,
 * and which event categories generate a notification at all. It owns its
 * model and emits {@link submitted} on every change — there is no separate
 * save step, each switch is its own commit, matching how a preference panel
 * (rather than a record edit) is normally expected to behave.
 *
 * Persisted via the settings `PATCH`; not yet enforced by notification
 * dispatch itself (`FEATURE.md`).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-notifications-form [notifications]="settings().notifications" [pending]="store.isSaving()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-notifications-form',
  imports: [FormField, HlmField, HlmFieldDescription, HlmFieldGroup, HlmFieldLabel, HlmSwitch],
  templateUrl: './organization-notifications-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationNotificationsForm {
  //#region Inputs
  /**
   * Property notifications
   * @readonly
   *
   * @description
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationNotificationSettings>}
   */
  public readonly notifications: InputSignal<OrganizationNotificationSettings> =
    input.required<OrganizationNotificationSettings>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is in flight, which locks every switch so a second toggle
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
   * Emits the full notification policy after any switch changes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationNotificationSettings>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationNotificationSettings> =
    output<OrganizationNotificationSettings>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values, re-seeded from {@link notifications} whenever it
   * changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationNotificationSettings>}
   */
  protected readonly model: WritableSignal<OrganizationNotificationSettings> = linkedSignal(
    (): OrganizationNotificationSettings => ({ ...this.notifications() }),
  );

  /**
   * Property notificationsForm
   * @readonly
   *
   * @description
   * The field tree. Every field is a plain boolean switch with no rule of its
   * own; the whole tree disables while {@link pending} is true, so a second
   * toggle cannot race the first — `hlm-switch` rejects a template
   * `[disabled]` binding alongside `[formField]` (NG8022), so the lock has to
   * live in the schema instead.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationNotificationSettings>}
   */
  protected readonly notificationsForm: FieldTree<OrganizationNotificationSettings> = form(
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
   * Emits the current values after a switch changes.
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
