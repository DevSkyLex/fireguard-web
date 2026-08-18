/**
 * Interface OrganizationApprovalActionRule
 * @interface OrganizationApprovalActionRule
 *
 * @description
 * One customized entry of the organization's four-eyes approval policy: an
 * action type gated on, the minimum approver role allowed to decide, and an
 * optional minimum severity below which the gate does not apply.
 */
export interface OrganizationApprovalActionRule {
  //#region Properties
  /** @type {boolean} */
  readonly enabled: boolean;
  /** @type {string} */
  readonly minApproverRole: string;
  /** @type {(string | null)} */
  readonly minSeverity: string | null;
  //#endregion
}
