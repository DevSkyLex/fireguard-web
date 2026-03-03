import type { HydraItem } from '@core/models/api';

export interface FacilityTypeOutput extends HydraItem {
  readonly value: string;
  readonly label: string;
}
