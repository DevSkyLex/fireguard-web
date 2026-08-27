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
import { form, FormField, type FieldTree } from '@angular/forms/signals';
import { HlmSwitch } from '@shared/ui/switch';
import type {
  AccountNotificationPreferenceRow,
  AccountNotificationPreferenceToggle,
} from './models';

/**
 * Component AccountNotificationPreferencesForm
 * @class AccountNotificationPreferencesForm
 *
 * @description
 * The category × channel matrix: a semantic table with one row per
 * notification category and one switch per delivery channel (email, in-app).
 * It owns its model — a Signal Forms field tree over the dynamic row list,
 * re-seeded from {@link rows} whenever they change — and emits
 * {@link toggled} on every flip; each switch is its own commit, there is no
 * separate save step.
 *
 * Unlike `OrganizationNotificationsForm`, the in-flight lock deliberately
 * does **not** use the schema's `disabled()`: disabling the focused switch
 * mid-save drops keyboard focus to the body, breaking WCAG 2.4.3 focus
 * order. Accessibility wins over the schema sugar — the fields stay enabled,
 * {@link pending} paints `aria-disabled` on every switch, {@link commit}
 * gates the emit, and the store's `exhaustMap` drops any race that still
 * slips through.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-account-notification-preferences-form [rows]="rows()" [pending]="store.isSaving()" (toggled)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-notification-preferences-form',
  imports: [FormField, HlmSwitch],
  templateUrl: './account-notification-preferences-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationPreferencesForm {
  //#region Inputs
  /**
   * Property rows
   * @readonly
   *
   * @description
   * The matrix rows — every known category with its effective channel flags.
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<AccountNotificationPreferenceRow>>}
   */
  public readonly rows: InputSignal<ReadonlyArray<AccountNotificationPreferenceRow>> =
    input.required<ReadonlyArray<AccountNotificationPreferenceRow>>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a commit is in flight. Marks every switch `aria-disabled` and
   * gates {@link commit} — never a native disable, which would drop focus
   * from the switch being saved.
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
   * Property toggled
   * @readonly
   *
   * @description
   * Emits the complete row values after any switch flips — both channel
   * flags, because the API upsert always writes a complete row.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<AccountNotificationPreferenceToggle>}
   */
  public readonly toggled: OutputEmitterRef<AccountNotificationPreferenceToggle> =
    output<AccountNotificationPreferenceToggle>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited rows, re-seeded from {@link rows} whenever they change.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<AccountNotificationPreferenceRow[]>}
   */
  protected readonly model: WritableSignal<AccountNotificationPreferenceRow[]> = linkedSignal(
    (): AccountNotificationPreferenceRow[] =>
      this.rows().map(
        (row: AccountNotificationPreferenceRow): AccountNotificationPreferenceRow => ({
          category: row.category,
          label: row.label,
          emailEnabled: row.emailEnabled,
          mercureEnabled: row.mercureEnabled,
        }),
      ),
  );

  /**
   * Property preferencesForm
   * @readonly
   *
   * @description
   * The field tree over the dynamic row list. No schema on purpose: every
   * field is a plain boolean switch with no rule of its own, and the
   * in-flight lock lives in `aria-disabled` + {@link commit} rather than in
   * `disabled()` (see the class JSDoc for the a11y reasoning).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FieldTree<AccountNotificationPreferenceRow[]>}
   */
  protected readonly preferencesForm: FieldTree<AccountNotificationPreferenceRow[]> = form(
    this.model,
  );
  //#endregion

  //#region Methods
  /**
   * Method commit
   * @method commit
   *
   * @description
   * Emits the current values of one row after a switch changes. Gated while
   * {@link pending}: the flip still lands in the local model (the field is
   * deliberately not disabled), but nothing is emitted — the next re-seed
   * settles the matrix back to the canonical rows.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {number} index - The index of the changed row in the model.
   *
   * @returns {void}
   */
  protected commit(index: number): void {
    if (this.pending()) return;

    const row: AccountNotificationPreferenceRow | undefined = this.model()[index];
    if (!row) return;

    this.toggled.emit({
      category: row.category,
      emailEnabled: row.emailEnabled,
      mercureEnabled: row.mercureEnabled,
    });
  }
  //#endregion
}
