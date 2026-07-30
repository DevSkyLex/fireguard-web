import type { TagDescriptor } from '@shared/tag';

/**
 * Presentation descriptor for a single organization people-management enum
 * value (invitation status, member status).
 *
 * Aliases the app-wide {@link TagDescriptor} (label + severity + icon) so the
 * registry keeps a domain-named type while the shared {@link Tag} component
 * owns the rendering and the severity → colour mapping.
 */
export type InvitationTagDescriptor = TagDescriptor;
