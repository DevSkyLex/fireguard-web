import type { HydraItem } from '@core/models/api';

export interface MercureSubscriptionOutput extends HydraItem {
  readonly token: string;
  readonly topic: string;
}
