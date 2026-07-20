import type { TagDescriptor } from '@shared/components';

/**
 * Presentation descriptor for an account status value
 * (`active`, `inactive`, `locked`, `pending_verification`).
 *
 * Aliases the app-wide {@link TagDescriptor} (label + severity + icon) so the
 * registry keeps a domain-named type while the shared `Tag` component owns the
 * rendering and the severity → colour mapping.
 */
export type AccountStatusTagDescriptor = TagDescriptor;
