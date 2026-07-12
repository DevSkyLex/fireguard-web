import type { TagDescriptor } from '@shared/components';

/**
 * Presentation descriptor for a single inspection-owned enum value (inspection
 * status/result and non-conformity severity/status).
 *
 * Aliases the app-wide {@link TagDescriptor} (label + severity + icon) so the
 * registry keeps a domain-named type while the shared {@link Tag} component owns
 * the rendering and the severity → colour mapping.
 */
export type InspectionTagDescriptor = TagDescriptor;
