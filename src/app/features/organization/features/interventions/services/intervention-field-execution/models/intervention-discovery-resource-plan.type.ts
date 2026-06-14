import type {
  MissionOutboxPayloadMap,
  MissionOutboxType,
} from '@features/organization/features/missions/models';

/**
 * Prepared canonical resource creation for a field discovery.
 */
export type MissionDiscoveryResourcePlan = {
  [Type in Extract<
    MissionOutboxType,
    'facility.create' | 'equipment.create' | 'inspection.create'
  >]: {
    readonly type: Type;
    readonly payload: MissionOutboxPayloadMap[Type];
    readonly targetResource: string;
    readonly resultResource?: string;
  };
}[Extract<MissionOutboxType, 'facility.create' | 'equipment.create' | 'inspection.create'>];
