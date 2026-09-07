import type { FederatedAuthErrorCode } from '@features/auth/models';

/**
 * Constant FEDERATED_AUTH_ERROR_MESSAGES
 * @readonly
 *
 * @description
 * Localized user-facing copy for every stable federation and first-password
 * error code published by the Auth feature.
 *
 * @access private
 * @since 1.0.0
 * @type {Readonly<Record<FederatedAuthErrorCode, string>>}
 */
const FEDERATED_AUTH_ERROR_MESSAGES: Readonly<Record<FederatedAuthErrorCode, string>> = {
  account_exists: $localize`:@@auth.federated.error.accountExists:Sign in with your password, then connect this provider from Security.`,
  account_unavailable: $localize`:@@auth.federated.error.accountUnavailable:This Fireguard account cannot sign in.`,
  email_missing: $localize`:@@auth.federated.error.missingEmail:The provider did not return an email address that Fireguard can use.`,
  email_unverified: $localize`:@@auth.federated.error.emailUnverified:The provider did not confirm a verified email address.`,
  expired: $localize`:@@auth.federated.error.challengeExpired:This verification request can no longer be used. Send a new code.`,
  federated_auth_failed: $localize`:@@auth.federated.error.providerUnavailable:This sign-in provider is temporarily unavailable. Try again.`,
  identity_linked: $localize`:@@auth.federated.error.identityLinked:This provider account is already connected to another Fireguard account.`,
  identity_missing: $localize`:@@auth.federated.error.identityMissing:The provider did not return an identity that Fireguard can use.`,
  invalid_code: $localize`:@@auth.federated.error.invalidCode:The verification code is incorrect. Try again.`,
  invalid_flow: $localize`:@@auth.federated.error.invalidFlow:This sign-in request has expired or was already used. Start again.`,
  invalid_token: $localize`:@@auth.federated.error.challengeExpired:This verification request can no longer be used. Send a new code.`,
  last_sign_in_method: $localize`:@@auth.federated.error.lastSignInMethod:Add another sign-in method before removing this one.`,
  max_attempts_exceeded: $localize`:@@auth.federated.error.challengeExpired:This verification request can no longer be used. Send a new code.`,
  password_already_configured: $localize`:@@auth.federated.error.passwordAlreadyConfigured:A password is already configured for this account.`,
  provider_already_linked: $localize`:@@auth.federated.error.providerAlreadyLinked:A provider of this type is already connected to your account.`,
  provider_cancelled: $localize`:@@auth.federated.error.providerCancelled:Sign-in was cancelled. You can try again.`,
  provider_unavailable: $localize`:@@auth.federated.error.providerUnavailable:This sign-in provider is temporarily unavailable. Try again.`,
  unknown_provider: $localize`:@@auth.federated.error.providerUnavailable:This sign-in provider is temporarily unavailable. Try again.`,
};

/**
 * Function isFederatedAuthErrorCode
 * @function isFederatedAuthErrorCode
 *
 * @description Narrows an untrusted API detail to a published Auth error code.
 *
 * @access public
 * @since 1.0.0
 * @param {string} value - Untrusted RFC 7807 detail or result code.
 * @returns {value is FederatedAuthErrorCode} Whether the value is a known stable code.
 */
export function isFederatedAuthErrorCode(value: string): value is FederatedAuthErrorCode {
  return Object.hasOwn(FEDERATED_AUTH_ERROR_MESSAGES, value);
}

/**
 * Function resolveFederatedAuthErrorMessage
 * @function resolveFederatedAuthErrorMessage
 *
 * @description
 * Converts a stable Auth code into localized copy and falls back to a neutral,
 * non-sensitive message for transport errors or future server codes.
 *
 * @access public
 * @since 1.0.0
 * @param {string | null | undefined} value - Stable API code when available.
 * @returns {string} Localized message safe to render to the user.
 */
export function resolveFederatedAuthErrorMessage(value: string | null | undefined): string {
  if (value && isFederatedAuthErrorCode(value)) return FEDERATED_AUTH_ERROR_MESSAGES[value];

  return $localize`:@@auth.federated.error.fallback:We couldn't complete this request. Try again.`;
}
