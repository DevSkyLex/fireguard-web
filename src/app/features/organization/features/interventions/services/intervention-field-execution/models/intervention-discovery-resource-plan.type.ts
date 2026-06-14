import type {
  InterventionOutboxPayloadMap,
  InterventionOutboxType,
} from '@features/organization/features/interventions/models';

/**
 * Prepared canonical resource creation for a field discovery.
 */
export type InterventionDiscoveryResourcePlan = {
  [Type in Extract<
    InterventionOutboxType,
    'facility.create' | 'equipment.create' | 'inspection.create'
  >]: {
    readonly type: Type;
    readonly payload: InterventionOutboxPayloadMap[Type];
    readonly targetResource: string;
    readonly resultResource?: string;
  };
}[Extract<InterventionOutboxType, 'facility.create' | 'equipment.create' | 'inspection.create'>];
