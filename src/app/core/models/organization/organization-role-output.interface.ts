import type { HydraItem } from '@core/models/api';

export interface OrganizationRoleOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly permissions: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
