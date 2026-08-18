/**
 * Interface OrganizationApprovalRuleDraft
 * @interface OrganizationApprovalRuleDraft
 *
 * @description
 * One catalog action type's edited rule row as the form's Signal Forms
 * model holds it — `minSeverity` is the `NO_MINIMUM_SEVERITY`
 * (`../constants`) sentinel rather than `null`.
 */
export interface OrganizationApprovalRuleDraft {
  readonly enabled: boolean;
  readonly minApproverRole: string;
  readonly minSeverity: string;
}

/**
 * Interface OrganizationApprovalFormDraft
 * @interface OrganizationApprovalFormDraft
 *
 * @description The form's Signal Forms model: one draft row per catalog action type, self-approval, and the request TTL.
 */
export interface OrganizationApprovalFormDraft {
  readonly actionRules: Readonly<Record<string, OrganizationApprovalRuleDraft>>;
  readonly allowSelfApproval: boolean;
  readonly approvalTtlDays: number;
}

/**
 * Interface OrganizationApprovalRuleFormValue
 * @interface OrganizationApprovalRuleFormValue
 *
 * @description
 * One catalog action type's rule row as {@link OrganizationApprovalForm}
 * emits it — always the full effective shape (catalog default overlaid
 * with the organization's customization), never a partial: this form
 * always sends every catalog row on submit, matching
 * `OrganizationComplianceForm`'s full-map submit shape.
 */
export interface OrganizationApprovalRuleFormValue {
  readonly enabled: boolean;
  readonly minApproverRole: string;
  readonly minSeverity: string | null;
}

/**
 * Interface OrganizationApprovalFormValues
 * @interface OrganizationApprovalFormValues
 *
 * @description
 * The approval policy form's emitted values: one row per catalog action
 * type (keyed by its value), self-approval, and the request TTL.
 */
export interface OrganizationApprovalFormValues {
  readonly actionRules: Readonly<Record<string, OrganizationApprovalRuleFormValue>>;
  readonly allowSelfApproval: boolean;
  readonly approvalTtlDays: number;
}
