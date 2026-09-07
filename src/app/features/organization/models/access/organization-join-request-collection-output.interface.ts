import type { HydraCollection } from '@core/api/models';
import type { OrganizationJoinRequestOutput } from './organization-join-request-output.interface';
/**
 * Interface OrganizationJoinRequestCollectionOutput
 * @interface OrganizationJoinRequestCollectionOutput
 * @description Requests and roles the current reviewer is authorized to assign, independent of role-catalog read permission.
 * @since 1.0.0
 */
export interface OrganizationJoinRequestCollectionOutput extends HydraCollection<OrganizationJoinRequestOutput> {
  assignableRoles: { id: string; label: string }[];
}
