import type { CollectionFilterOption } from '@shared/collection-filters/models';

/**
 * Interface CollectionFilterOptionGroup
 * @interface CollectionFilterOptionGroup
 * @description One ordered visual group in the single-choice filter catalog.
 * @since 1.0.0
 */
export interface CollectionFilterOptionGroup {
  /**
   * Property key
   * @readonly
   * @description Stable catalog group key; an empty key groups unlabeled options.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   * @description Optional heading supplied by the first option in the group.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly label: string | null;

  /**
   * Property options
   * @readonly
   * @description Options in their original catalog order.
   * @access public
   * @since 1.0.0
   * @type {readonly CollectionFilterOption[]}
   */
  readonly options: readonly CollectionFilterOption[];
}
