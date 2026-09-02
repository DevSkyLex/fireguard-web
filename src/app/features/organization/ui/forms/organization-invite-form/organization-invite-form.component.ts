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
import { email, form, FormField, required, type FieldTree } from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import type {
  InviteOrganizationMemberInput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { serverMessagesOf } from '@shared/form-feedback';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { OrganizationInviteFormDraft } from './models';

/** A blank draft. */
const EMPTY_VALUES: OrganizationInviteFormDraft = { email: '', roleId: '' };

/**
 * Component OrganizationInviteForm
 * @class OrganizationInviteForm
 *
 * @description
 * The form that invites someone to the organization by email, built from
 * spartan's field primitives the same way `FacilityCreateForm` is: one
 * `hlm-field-group`, one `hlm-field` per control, Signal Forms rules in the
 * schema. Only the email is required — the role is a single optional pick
 * from the organization's roles; sending several roles per invitation is
 * possible on the wire (`InviteOrganizationMemberInput.roleIds`) but this
 * form covers the common one-role case, which is what the invite dialog
 * offers.
 *
 * It owns its model and its own validity, and emits {@link submitted} with
 * the API-shaped payload — the page calls the store (`ARCHITECTURE.md`
 * §10.4). `serverError` is the store's own normalized `StoreError`, not a
 * raw thrown value, so a quota rejection's backend-authored sentence
 * (`"The current plan limit of N members has been reached."`) reaches the
 * banner verbatim rather than being replaced by a generic fallback.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invite-form',
  imports: [
    RequiredMarker,
    FormField,
    HlmButton,
    HlmInput,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './organization-invite-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInviteForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether an invite request is in flight, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description The store's normalized error from the last invite attempt.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property roleOptions
   * @readonly
   * @description The organization's roles, offered as the invitee's starting role.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationRoleOutput[]>}
   */
  public readonly roleOptions: InputSignal<readonly OrganizationRoleOutput[]> = input<
    readonly OrganizationRoleOutput[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the API-shaped payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InviteOrganizationMemberInput>}
   */
  public readonly submitted: OutputEmitterRef<InviteOrganizationMemberInput> =
    output<InviteOrganizationMemberInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without inviting anyone.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<OrganizationInviteFormDraft> =
    signal<OrganizationInviteFormDraft>(EMPTY_VALUES);

  /**
   * Property inviteForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OrganizationInviteFormDraft>}
   */
  protected readonly inviteForm: FieldTree<OrganizationInviteFormDraft> = form(
    this.model,
    (path) => {
      required(path.email, {
        message: $localize`:@@org.inviteForm.emailRequired:Enter an email address.`,
      });
      email(path.email, {
        message: $localize`:@@org.inviteForm.emailInvalid:Enter a valid email address.`,
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
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() =>
    serverMessagesOf(
      this.serverError(),
      ['email'],
      $localize`:@@org.inviteForm.submitFailed:The invitation could not be sent.`,
    ),
  );

  /** Names a picked role on the closed select trigger. */
  protected readonly roleLabelOf: (value: string) => string = (value: string): string =>
    this.roleOptions().find((role: OrganizationRoleOutput): boolean => role.id === value)?.name ??
    '';
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @description Marks the tree touched so an unmet rule shows, then emits when the form is valid.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The submit event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.inviteForm().markAsTouched();

    if (this.inviteForm().invalid()) return;

    const draft: OrganizationInviteFormDraft = this.model();

    this.submitted.emit({
      email: draft.email.trim(),
      roleIds: draft.roleId === '' ? undefined : [draft.roleId],
    });
  }
  //#endregion
}
