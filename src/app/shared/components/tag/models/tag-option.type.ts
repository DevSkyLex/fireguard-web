import type { TagDescriptor } from './tag-descriptor.interface';

/**
 * Type TagOption
 * @typedef TagOption
 *
 * @description
 * A {@link TagDescriptor} (`label`, `severity`, `icon`) paired with the API
 * enum `value` it represents. This is the single shared shape behind every
 * per-table "status/type option" that both renders an `<app-tag>` badge and
 * forwards the matching value in a column filter, so a table parameterizes
 * this generic (`TagOption<FacilityStatus>`) instead of re-declaring
 * `extends TagDescriptor { readonly value }` per entity.
 *
 * @template TValue - API enum value represented by the option.
 *
 * @access public
 * @since 1.0.0
 */
export type TagOption<TValue extends string = string> = TagDescriptor & {
  readonly value: TValue;
};
