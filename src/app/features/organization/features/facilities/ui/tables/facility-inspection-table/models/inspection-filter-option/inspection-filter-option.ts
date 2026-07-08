import type { TagOption } from '@shared/components';

/**
 * Type InspectionFilterOption
 * @typedef InspectionFilterOption
 *
 * @description
 * Option rendered by facility inspection result and status filters and their
 * badges — the shared {@link TagOption} generic specialized to the inspection
 * filter value type.
 *
 * @template TValue Inspection filter value type.
 *
 * @since 1.0.0
 */
export type InspectionFilterOption<TValue extends string> = TagOption<TValue>;
