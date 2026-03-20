import type { OrganizationRoleOutput } from '@core/models/organization';

export interface OrganizationRoleListState {
  readonly roles: OrganizationRoleOutput[];
  readonly rolesLoading: boolean;
}
