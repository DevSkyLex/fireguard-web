import type { HydraItem } from '@core/models/api';

export interface OrganizationPermissionOutput extends HydraItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}
