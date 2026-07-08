import type { TagOption } from '@shared/components';

/**
 * Type InspectionFilterOption
 * @typedef InspectionFilterOption
 *
 * @description
 * Visual configuration used to render inspection result/status badges and their
 * matching filter options with the same icon and severity colour — the shared
 * {@link TagOption} generic re-exposed under the inspection-table name.
 *
 * @template TValue - API enum value represented by the option.
 *
 * @since 1.0.0
 */
export type InspectionFilterOption<TValue extends string = string> = TagOption<TValue>;
