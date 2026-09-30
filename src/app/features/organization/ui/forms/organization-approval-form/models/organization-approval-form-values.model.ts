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
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Controls whether this action type requires approval.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly enabled: boolean;

  /**
   * Property minApproverRole
   * @readonly
   *
   * @description
   * Identifies the minimum organization role allowed to approve this action.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly minApproverRole: string;

  /**
   * Property minSeverity
   * @readonly
   *
   * @description
   * Holds the severity threshold or the form's no-minimum sentinel.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly minSeverity: string;
}

/**
 * Interface OrganizationApprovalFormDraft
 * @interface OrganizationApprovalFormDraft
 *
 * @description
 * The form's Signal Forms model: one draft row per catalog action type, self-approval, and the
 * request TTL.
 */
export interface OrganizationApprovalFormDraft {
  /**
   * Property actionRules
   * @readonly
   *
   * @description
   * Maps each catalog action type to its current editable approval rule.
   *
   * @access public
   * @since unreleased
   *
   * @type {Readonly<Record<string, OrganizationApprovalRuleDraft>>}
   */
  readonly actionRules: Readonly<Record<string, OrganizationApprovalRuleDraft>>;

  /**
   * Property allowSelfApproval
   * @readonly
   *
   * @description
   * Controls whether an action's submitter may also approve it.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly allowSelfApproval: boolean;

  /**
   * Property approvalTtlDays
   * @readonly
   *
   * @description
   * Sets how many days an unapproved request remains open.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
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
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Indicates whether approval is required for this catalog action type.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly enabled: boolean;

  /**
   * Property minApproverRole
   * @readonly
   *
   * @description
   * Identifies the minimum organization role allowed to approve this action.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly minApproverRole: string;

  /**
   * Property minSeverity
   * @readonly
   *
   * @description
   * Carries the configured severity threshold, or null when none is set.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
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
  /**
   * Property actionRules
   * @readonly
   *
   * @description
   * Emits the full effective rule row for every catalog action type.
   *
   * @access public
   * @since unreleased
   *
   * @type {Readonly<Record<string, OrganizationApprovalRuleFormValue>>}
   */
  readonly actionRules: Readonly<Record<string, OrganizationApprovalRuleFormValue>>;

  /**
   * Property allowSelfApproval
   * @readonly
   *
   * @description
   * Emits whether submitters may approve their own actions.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly allowSelfApproval: boolean;

  /**
   * Property approvalTtlDays
   * @readonly
   *
   * @description
   * Emits the number of days an unapproved request remains open.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly approvalTtlDays: number;
}
