import type { HydraItem } from '@core/models/api';

export interface NotificationTypeOutput extends HydraItem {
  readonly type: string;
  readonly category: string;
}
