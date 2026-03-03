import type { HydraItem } from '@core/models/api';
import type { ChecklistItemOutput } from './checklist-item-output.interface';

export type ChecklistStatus = 'active' | 'archived';

export interface ChecklistOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly version: string;
  readonly status: ChecklistStatus;
  readonly items: ReadonlyArray<ChecklistItemOutput>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
