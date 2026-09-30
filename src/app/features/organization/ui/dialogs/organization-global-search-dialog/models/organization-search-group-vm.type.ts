import type {
  OrganizationSearchHitOutput,
  OrganizationSearchResultType,
} from '@features/organization/models';

/**
 * Type OrganizationSearchGroupVm
 *
 * @description
 * Local presentation of one result group, preserving the backend's hit order.
 *
 * @since 1.0.0
 *
 * @type OrganizationSearchGroupVm
 */
export type OrganizationSearchGroupVm = {
  /**
   * Property type
   * @readonly
   *
   * @description
   * Backend result category used to select the group's route and icon behavior.
   *
   * @access public
   * @since unreleased
   *
   * @type {OrganizationSearchResultType}
   */
  readonly type: OrganizationSearchResultType;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized heading displayed above the matching results.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Registered icon name associated with this result category.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property hits
   * @readonly
   *
   * @description
   * Matching backend records kept in their returned order.
   *
   * @access public
   * @since unreleased
   *
   * @type {readonly OrganizationSearchHitOutput[]}
   */
  readonly hits: readonly OrganizationSearchHitOutput[];
};
