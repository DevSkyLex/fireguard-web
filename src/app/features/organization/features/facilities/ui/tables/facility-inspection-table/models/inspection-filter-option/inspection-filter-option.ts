import type { TagDescriptor } from '@shared/components';

/**
 * Interface InspectionFilterOption
 *
 * @description
 * Option rendered by facility inspection result and status filters and their
 * badges. Extends the shared {@link TagDescriptor} (`label`, `severity`,
 * `icon`) so it can be forwarded directly to `<app-tag>`, and adds the API
 * `value` sent to the inspection list filter.
 *
 * @template TValue Inspection filter value type.
 *
 * @since 1.0.0
 */
export interface InspectionFilterOption<TValue extends string> extends TagDescriptor {
  /**
   * Property value
   * @readonly
   *
   * @description
   * Inspection filter value sent to the inspection API.
   *
   * @type {TValue}
   */
  readonly value: TValue;
}
