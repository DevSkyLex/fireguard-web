import type { OrganizationApprovalActionRule } from './organization-approval-action-rule.interface';

/**
 * Interface OrganizationApprovalSettings
 * @interface OrganizationApprovalSettings
 *
 * @description
 * Organization-wide four-eyes approval policy. `actionRules` carries only the
 * CUSTOMIZED action types — every action type absent from the map is
 * disabled. Editable through `OrganizationApprovalForm` since the approvals
 * inbox lets a reader act on a gated request; the write shape is
 * {@link UpdateOrganizationApprovalInput}.
 */
export interface OrganizationApprovalSettings {
  //#region Properties
  /** @type {Readonly<Record<string, OrganizationApprovalActionRule>>} */
  readonly actionRules: Readonly<Record<string, OrganizationApprovalActionRule>>;
  /** @type {boolean} */
  readonly allowSelfApproval: boolean;
  /** @type {number} */
  readonly approvalTtlDays: number;
  //#endregion
}
