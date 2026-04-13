import type { CallState } from '@core/state/request-state';
import type { OrganizationRoleOutput } from '@features/organization/models';

export interface OrganizationRoleListState {
  readonly rolesCallState: CallState<OrganizationRoleOutput[]>;
}
