import type { HydraItem } from '@core/models/api';

export interface OrganizationRoleOutput extends HydraItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: ReadonlyArray<string>;
  readonly isSystem: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
