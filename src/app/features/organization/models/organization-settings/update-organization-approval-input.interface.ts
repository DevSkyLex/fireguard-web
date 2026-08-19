/**
 * Interface UpdateOrganizationApprovalActionRuleInput
 * @interface UpdateOrganizationApprovalActionRuleInput
 *
 * @description
 * A partial per-action-type rule write. Every field is optional and any
 * field left out keeps its current (or default) value; only `minSeverity`
 * accepts an explicit `null` to clear it back to "no minimum".
 */
export interface UpdateOrganizationApprovalActionRuleInput {
  //#region Properties
  /** @type {(boolean | undefined)} */
  readonly enabled?: boolean;
  /** Must be `'member'` or `'admin'` — the backend's only two legal values. @type {(string | undefined)} */
  readonly minApproverRole?: string;
  /** `nc_waiver` only; one of the four compliance severities, or `null` to clear it. @type {(string | null | undefined)} */
  readonly minSeverity?: string | null;
  //#endregion
}

/**
 * Interface UpdateOrganizationApprovalInput
 * @interface UpdateOrganizationApprovalInput
 *
 * @description
 * Partial payload for the organization's four-eyes approval policy —
 * `UpdateOrganizationApprovalInput.actionRules` mirrors the backend's
 * section-scoped shape byte for byte: keyed by action-type value, an entry
 * set to `null` **reverts that action type to disabled** rather than
 * merely omitting it, since the backend's `mergedWith` distinguishes
 * "not mentioned" (keep) from "explicitly null" (remove the customization).
 * Every top-level field is optional; only the provided fields are applied,
 * matching {@link UpdateOrganizationInput}'s other sections.
 */
export interface UpdateOrganizationApprovalInput {
  //#region Properties
  /** @type {(Readonly<Record<string, UpdateOrganizationApprovalActionRuleInput | null>> | undefined)} */
  readonly actionRules?: Readonly<Record<string, UpdateOrganizationApprovalActionRuleInput | null>>;
  /** @type {(boolean | undefined)} */
  readonly allowSelfApproval?: boolean;
  /** Inclusive bounds `[1, 90]`, enforced by the form. @type {(number | undefined)} */
  readonly approvalTtlDays?: number;
  //#endregion
}
