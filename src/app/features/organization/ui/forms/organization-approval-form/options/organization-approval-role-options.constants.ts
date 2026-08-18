/**
 * Constant ORGANIZATION_APPROVAL_ROLE_OPTIONS
 * @const ORGANIZATION_APPROVAL_ROLE_OPTIONS
 *
 * @description
 * The minimum-approver-role picker's choices — the backend's only two legal
 * values (`Organization\Domain\Catalog\OrganizationSystemRoleCatalog::MEMBER`
 * / `::ADMIN`, enforced by `OrganizationApprovalSettings::validateActionRules`).
 * A third role would fail the write with a domain validation error the form
 * never offers into.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
 */
export const ORGANIZATION_APPROVAL_ROLE_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: string;
}> = [
  { label: $localize`:@@org.settings.approval.roleMember:Member`, value: 'member' },
  { label: $localize`:@@org.settings.approval.roleAdmin:Admin`, value: 'admin' },
];
