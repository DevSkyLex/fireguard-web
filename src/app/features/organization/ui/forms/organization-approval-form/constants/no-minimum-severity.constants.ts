/**
 * Constant NO_MINIMUM_SEVERITY
 * @const NO_MINIMUM_SEVERITY
 *
 * @description
 * Sentinel `minSeverity` draft value standing for "no minimum" (`null` on
 * submit). Signal Forms binds a plain string enum more simply than a
 * nullable one, so the form edits this sentinel and `OrganizationApprovalForm`
 * converts it to `null` only at the emit boundary.
 *
 * @since 1.0.0
 * @type {string}
 */
export const NO_MINIMUM_SEVERITY: string = 'none';
