import { NOT_FOUND_COLLECTION_LABELS } from '../../constants';
import type { NotFoundOrigin } from '../../models';

/**
 * Function resolveNotFoundOrigin
 *
 * @description
 * Reads the organization and the collection out of an address that failed to
 * match, so the not-found page can offer a way back into the workspace the
 * member was aiming at.
 *
 * The address is untrusted input: only a well-formed
 * `/organizations/{id}[/{collection}]` shape yields anything, and the
 * collection is kept only when it is one the application actually serves.
 * Anything else resolves to a pair of `null`s and the page falls back to home.
 *
 * @param {string | null} attemptedUrl - The address that failed, query string included.
 *
 * @returns {NotFoundOrigin} What could be read from it.
 *
 * @since 1.0.0
 */
export function resolveNotFoundOrigin(attemptedUrl: string | null): NotFoundOrigin {
  const empty: NotFoundOrigin = { organizationId: null, collection: null };

  if (!attemptedUrl) return empty;

  const path: string = attemptedUrl.split('?')[0] ?? '';
  const segments: readonly string[] = path.split('/').filter((segment) => segment.length > 0);

  if (segments[0] !== 'organizations') return empty;

  const organizationId: string | undefined = segments[1];

  // `/organizations/invitations/accept` is a public route, not an organization.
  if (!organizationId || organizationId === 'invitations') return empty;

  const collection: string | undefined = segments[2];
  const isServedCollection: boolean =
    collection !== undefined && collection in NOT_FOUND_COLLECTION_LABELS;

  return {
    organizationId,
    collection: isServedCollection ? (collection ?? null) : null,
  };
}
