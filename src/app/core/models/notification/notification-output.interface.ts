import type { HydraItem } from '@core/models/api';

export interface NotificationOutput extends HydraItem {
  readonly id: string;
  readonly type: string;
  readonly category: string;
  readonly subject: string;
  readonly body: string;
  readonly channels: readonly string[];
  readonly payload: Readonly<Record<string, string | null>>;
  readonly isRead: boolean;
  readonly createdAt: string;
  readonly readAt: string | null;
}
