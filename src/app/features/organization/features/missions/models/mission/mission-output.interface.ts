import type { HydraItem } from '@core/models/api';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { InspectionOutput } from '@features/organization/features/inspections/models';

/**
 * Type MissionStatus
 *
 * @description
 * Workflow status of a mission from creation to publication.
 */
export type MissionStatus = 'draft' | 'published' | 'abandoned';

/**
 * Type MissionIssueSeverity
 *
 * @description
 * Severity levels returned by mission readiness checks.
 */
export type MissionIssueSeverity = 'blocker' | 'warning' | 'recommendation';

/**
 * Interface MissionOutput
 *
 * @description
 * Mission resource returned by the API.
 */
export interface MissionOutput extends HydraItem {
  readonly id: string;
  readonly organization: string;
  readonly type: 'site_setup';
  readonly name: string;
  readonly status: MissionStatus;
  readonly referencePack: string;
  readonly revision: number;
  readonly facilitiesCount: number;
  readonly equipmentCount: number;
  readonly inspectionsCount: number;
  readonly blockersCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Interface MissionIssueOutput
 *
 * @description
 * Mission validation issue returned by mission readiness checks.
 */
export interface MissionIssueOutput extends HydraItem {
  readonly severity: MissionIssueSeverity;
  readonly resource: string;
  readonly field: string | null;
  readonly message: string;
}

/**
 * Interface PublicationOutput
 *
 * @description
 * Publication resource tracking mission publication execution.
 */
export interface PublicationOutput extends HydraItem {
  readonly id: string;
  readonly mission: string;
  readonly missionRevision: number;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly error: string | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

/**
 * Interface MediaOutput
 *
 * @description
 * Media resource created from mission evidence uploads.
 */
export interface MediaOutput extends HydraItem {
  readonly id: string;
  readonly equipmentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly label: string | null;
  readonly uploadedAt: string;
}

/**
 * Interface MissionSnapshot
 *
 * @description
 * Offline mission snapshot persisted locally for resilience and resume flows.
 */
export interface MissionSnapshot {
  readonly mission: MissionOutput;
  readonly issues: readonly MissionIssueOutput[];
  readonly facilities: readonly FacilityOutput[];
  readonly equipment: readonly EquipmentOutput[];
  readonly inspections: readonly InspectionOutput[];
  readonly savedAt: string;
}
