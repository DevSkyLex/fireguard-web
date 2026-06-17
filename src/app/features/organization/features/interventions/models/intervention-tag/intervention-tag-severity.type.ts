import type { TagSeverity } from '@shared/components';

/**
 * Severity vocabulary shared by every intervention status/enum indicator.
 *
 * Aliases the app-wide {@link TagSeverity} so the intervention registry keeps
 * a domain-named type while delegating the actual colour contract to the
 * shared {@link Tag} component.
 */
export type InterventionTagSeverity = TagSeverity;
