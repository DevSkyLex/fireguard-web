import type { TagDescriptor } from '@shared/components';

/**
 * Presentation descriptor for a single intervention enum value.
 *
 * Aliases the app-wide {@link TagDescriptor} (label + severity + icon) so the
 * intervention registry keeps a domain-named type while the shared {@link Tag}
 * component owns the rendering and the severity → colour mapping. One
 * descriptor drives the value wherever it appears — table/panel badge or form
 * select option.
 */
export type InterventionTagDescriptor = TagDescriptor;
