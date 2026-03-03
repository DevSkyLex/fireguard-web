import type { HydraItem } from '@core/models/api';

export interface OrganizationCountryOutput extends HydraItem {
  readonly code: string;
  readonly name: string;
  readonly flagUrl: string;
}
