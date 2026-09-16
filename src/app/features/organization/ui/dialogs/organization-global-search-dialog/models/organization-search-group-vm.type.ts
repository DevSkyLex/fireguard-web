import type {
  OrganizationSearchHitOutput,
  OrganizationSearchResultType,
} from '@features/organization/models';

/**
 * Type OrganizationSearchGroupVm
 * @type OrganizationSearchGroupVm
 * @description Local presentation of one result group, preserving the backend's hit order.
 * @since 1.0.0
 */
export type OrganizationSearchGroupVm = {
  readonly type: OrganizationSearchResultType;
  readonly label: string;
  readonly icon: string;
  readonly hits: readonly OrganizationSearchHitOutput[];
};
