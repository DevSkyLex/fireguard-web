import type { HydraItem } from '@core/models/api';

export type NonConformitySeverity = 'low' | 'medium' | 'high' | 'critical';

export type NonConformityStatus = 'open' | 'in_progress' | 'done' | 'waived';

export interface NonConformityOutput extends HydraItem {
  readonly id: string;
  readonly inspectionId: string;
  readonly description: string;
  readonly severity: NonConformitySeverity;
  readonly status: NonConformityStatus;
  readonly dueAt: string | null;
  readonly resolvedAt: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
