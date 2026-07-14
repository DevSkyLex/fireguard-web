import type { TagDescriptor } from '@shared/components';

/**
 * Presentation descriptor for a single multi-factor authentication method
 * status (email code, authenticator app).
 *
 * Aliases the app-wide {@link TagDescriptor} (label + severity + icon) so the
 * registry keeps a domain-named type while the shared `Tag` component owns
 * the rendering and the severity → colour mapping.
 */
export type MfaMethodTagDescriptor = TagDescriptor;
