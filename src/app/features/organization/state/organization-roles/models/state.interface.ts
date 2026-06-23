import type { CallState } from '@core/request-state';
import type { OrganizationRoleOutput } from '@features/organization/models';

export interface OrganizationRoleListState {
  readonly rolesCallState: CallState<OrganizationRoleOutput[]>;
}
