/**
 * Type OrganizationSearchResultType
 *
 * @description
 * Discriminator for one global-search hit, matching the backend enum byte
 * for byte (`GET /organizations/{organizationId}/search`). The five values
 * arrive in this stable order; a type the caller lacks the read permission
 * for is silently omitted by the backend, never an error.
 *
 * @since 1.0.0
 */
export type OrganizationSearchResultType =
  | 'equipment'
  | 'facility'
  | 'intervention'
  | 'inspection'
  | 'non_conformity';
