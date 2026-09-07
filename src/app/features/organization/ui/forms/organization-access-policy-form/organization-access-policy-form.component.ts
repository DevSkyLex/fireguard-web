import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, disabled, required, type FieldTree } from '@angular/forms/signals';
import type {
  OrganizationAccessPolicyInput,
  OrganizationAccessPolicyOutput,
  OrganizationJoinMode,
} from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmRadioGroupImports } from '@shared/ui/radio-group';
import { HlmSelectImports } from '@shared/ui/select';

/**
 * Component OrganizationAccessPolicyForm
 * @class OrganizationAccessPolicyForm
 * @description Signal Forms editor for organization admission. Automatic membership requires explicit role selection and a native confirmation dialog.
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-access-policy-form',
  imports: [
    FormField,
    HlmFieldImports,
    HlmRadioGroupImports,
    HlmSelectImports,
    HlmButton,
    HlmDialogImports,
  ],
  templateUrl: './organization-access-policy-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAccessPolicyForm {
  /**
   * Property policy
   * @readonly
   * @description Server policy and eligible role catalog.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationAccessPolicyOutput>}
   */
  public readonly policy: InputSignal<OrganizationAccessPolicyOutput> =
    input.required<OrganizationAccessPolicyOutput>();
  /**
   * Property pending
   * @readonly
   * @description Locks changes during persistence.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property policyRevision
   * @readonly
   * @description Resets the draft only after a successful policy save or organization change.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly policyRevision: InputSignal<number> = input(0);
  /**
   * Property submitted
   * @readonly
   * @description Confirmed policy update.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationAccessPolicyInput>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationAccessPolicyInput> = output();
  /**
   * Property model
   * @readonly
   * @description Editable policy retained during DNS and role-catalog refreshes; only the explicit revision or policy identity resets it.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<{mode: OrganizationJoinMode; roleId: string}>}
   */
  protected readonly model: WritableSignal<{ mode: OrganizationJoinMode; roleId: string }> =
    linkedSignal({
      source: () => `${this.policy()['@id']}:${this.policyRevision()}`,
      computation: (revision, previous) =>
        previous?.source === revision
          ? previous.value
          : untracked(() => ({ mode: this.policy().mode, roleId: this.policy().roleId ?? '' })),
    });
  /**
   * Property roleLabelOf
   * @readonly
   * @description Resolves persisted role IDs without exposing identifiers in the select trigger.
   * @access protected
   * @since 1.0.0
   * @type {(id: string) => string}
   */
  protected readonly roleLabelOf: (id: string) => string = (id) =>
    this.policy().eligibleRoles.find((role) => role.id === id)?.label ??
    (this.policy().roleId === id ? this.policy().roleLabel : undefined) ??
    $localize`:@@org.access.roleUnavailable:Role unavailable`;
  /**
   * Property policyForm
   * @readonly
   * @description Mode and role fields disabled while saving.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<{mode: OrganizationJoinMode; roleId: string}>}
   */
  protected readonly policyForm: FieldTree<{ mode: OrganizationJoinMode; roleId: string }> = form(
    this.model,
    (path) => {
      disabled(path, () => this.pending());
      required(path.roleId, {
        when: ({ valueOf }) => valueOf(path.mode) === 'automatic',
        message: $localize`:@@org.access.roleRequired:Choose an eligible role.`,
      });
    },
  );
  /**
   * Property automatic
   * @readonly
   * @description Whether the selected policy grants immediate membership.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly automatic: Signal<boolean> = computed(() => this.model().mode === 'automatic');
  /**
   * Property confirming
   * @readonly
   * @description Automatic membership confirmation visibility.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirming: WritableSignal<boolean> = signal(false);
  /**
   * Property roleLabel
   * @readonly
   * @description Selected eligible role label for the confirmation.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly roleLabel: Signal<string> = computed(
    () => this.policy().eligibleRoles.find((role) => role.id === this.model().roleId)?.label ?? '',
  );
  /**
   * Property verifiedDomains
   * @readonly
   * @description Verified domains affected by the policy.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly verifiedDomains: Signal<string> = computed(() =>
    this.policy()
      .domains.filter((domain) => domain.status === 'verified')
      .map((domain) => domain.domain)
      .join(', '),
  );
  /**
   * Property noDomainText
   * @readonly
   * @description Explains that verification must precede discovery.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly noDomainText: string = $localize`:@@org.access.noVerifiedDomain:No verified domain yet. Discovery remains unavailable until a domain is verified.`;
  /**
   * Property options
   * @readonly
   * @description Native radio options describing admission consequences.
   * @access protected
   * @since 1.0.0
   * @type {ReadonlyArray<{value: OrganizationJoinMode; label: string; description: string}>}
   */
  protected readonly options: ReadonlyArray<{
    value: OrganizationJoinMode;
    label: string;
    description: string;
  }> = [
    {
      value: 'invitation_only',
      label: $localize`:@@org.access.mode.invitation:Invitation only`,
      description: $localize`:@@org.access.mode.invitationHelp:Only people invited by a member can join.`,
    },
    {
      value: 'approval_required',
      label: $localize`:@@org.access.mode.approval:Administrator approval`,
      description: $localize`:@@org.access.mode.approvalHelp:People with a verified company email can request membership.`,
    },
    {
      value: 'automatic',
      label: $localize`:@@org.access.mode.automatic:Immediate membership`,
      description: $localize`:@@org.access.mode.automaticHelp:Eligible people can join with the selected role, without administrator approval.`,
    },
  ];
  /**
   * Method submit
   * @method submit
   * @description Validates the form and confirms every automatic policy submission.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - Native submit event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.policyForm.mode().markAsTouched();
    this.policyForm.roleId().markAsTouched();
    if (this.pending() || this.policyForm().invalid()) return;
    if (this.automatic()) {
      this.confirming.set(true);
      return;
    }
    this.confirm();
  }
  /**
   * Method confirm
   * @method confirm
   * @description Emits the explicit selected policy; the page owns persistence.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    if (this.pending() || this.policyForm().invalid()) return;
    const { mode, roleId } = this.model();
    this.submitted.emit({ mode, ...(mode === 'automatic' ? { roleId } : {}) });
    this.confirming.set(false);
  }
}
