import type { StoreError } from '@core/request-state';
/**
 * Function organizationAccessErrorMessage
 * @function organizationAccessErrorMessage
 * @description Maps stable admission errors to localized guidance. Unknown errors use neutral localized guidance; HTTP conflicts are not assumed to mean quota exhaustion.
 * @access public
 * @since 1.0.0
 * @param {StoreError | null} error - Normalized store error or no error.
 * @returns {string | null} Localized message when an error exists.
 */
export function organizationAccessErrorMessage(error: StoreError | null): string | null {
  if (!error) return null;
  const raw: unknown = error.error;
  const direct: unknown =
    typeof raw === 'object' && raw !== null && 'code' in raw ? raw.code : null;
  const nested: unknown =
    typeof raw === 'object' && raw !== null && 'error' in raw ? raw.error : null;
  const nestedCode: unknown =
    typeof nested === 'object' && nested !== null && 'code' in nested ? nested.code : null;
  let code: unknown = error.code;
  if (typeof direct === 'string') code = direct;
  else if (typeof nestedCode === 'string') code = nestedCode;
  const messages: Readonly<Record<string, string>> = {
    organization_join_domain_invalid: $localize`:@@org.access.error.domainInvalid:Enter a valid company domain, without a URL or email address.`,
    organization_join_domain_generic: $localize`:@@org.access.error.domainGeneric:Public or disposable email providers cannot be used for organization discovery.`,
    organization_join_domain_public: $localize`:@@org.access.error.domainPublic:Choose a company-owned domain, not a public suffix.`,
    organization_join_domain_catalog_unavailable: $localize`:@@org.access.error.domainCatalogUnavailable:Domain verification is temporarily unavailable. Try again later.`,
    organization_join_domain_unavailable: $localize`:@@org.access.error.domainUnavailable:Verify an active company domain before enabling discovery or approving this request.`,
    organization_join_domain_limit: $localize`:@@org.access.error.domainLimit:This organization has reached its company domain limit.`,
    organization_join_role_required: $localize`:@@org.access.error.roleRequired:Choose at least one authorized role.`,
    organization_join_role_ineligible: $localize`:@@org.access.error.roleIneligible:This role is not eligible for the selected membership policy. Choose another role.`,
    organization_join_role_in_use: $localize`:@@org.access.error.roleInUse:This role is used for immediate membership. Replace it in access settings before changing it.`,
    organization_join_request_cooldown: $localize`:@@org.access.error.requestCooldown:A recent request was rejected. Wait seven days before requesting again, or ask for an invitation.`,
    organization_join_request_pending: $localize`:@@org.access.error.requestPending:A membership request is already awaiting review.`,
    organization_join_request_not_pending: $localize`:@@org.access.error.requestNotPending:This request can no longer be reviewed. Refresh the list to see its current status.`,
    organization_join_email_changed: $localize`:@@org.access.error.emailChanged:Your email address has changed. Verify your current address before continuing.`,
    organization_join_email_proof_required: $localize`:@@org.access.error.emailProofRequired:Verify your email address before discovering or joining an organization.`,
    organization_join_invitation_available: $localize`:@@org.access.error.invitationAvailable:You already have an invitation to this organization. Accept that invitation to continue.`,
    organization_join_approval_required: $localize`:@@org.access.error.approvalRequired:An administrator must approve your membership. Send a request to join.`,
    organization_join_mode_invalid: $localize`:@@org.access.error.modeInvalid:Choose a valid organization access policy.`,
    organization_join_invalid_request: $localize`:@@org.access.error.invalidRequest:This request is no longer valid. Refresh the page and try again.`,
    organization_join_unavailable: $localize`:@@org.access.error.unavailable:This organization is not available to join.`,
    quota_exceeded: $localize`:@@org.access.error.quota:The organization has no member seats available. Ask an administrator to review its plan.`,
    organization_quota_exceeded: $localize`:@@org.access.error.quota:The organization has no member seats available. Ask an administrator to review its plan.`,
  };
  if (typeof code === 'string' && typeof messages[code] === 'string') return messages[code];
  if (error.code === 403)
    return $localize`:@@org.access.error.forbidden:You do not have permission to perform this action.`;
  if (error.code === 429)
    return $localize`:@@org.access.error.rateLimited:Too many attempts. Wait a moment before trying again.`;
  return $localize`:@@org.access.error.fallback:Could not complete this request. Try again.`;
}
