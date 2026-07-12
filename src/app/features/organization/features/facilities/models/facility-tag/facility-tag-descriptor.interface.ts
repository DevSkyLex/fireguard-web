import type { TagDescriptor } from '@shared/components';

/**
 * Presentation descriptor for a single facility-owned enum value (facility
 * lifecycle status).
 *
 * Aliases the app-wide {@link TagDescriptor} (label + severity + icon) so the
 * registry keeps a domain-named type while the shared {@link Tag} component owns
 * the rendering and the severity → colour mapping.
 */
export type FacilityTagDescriptor = TagDescriptor;
